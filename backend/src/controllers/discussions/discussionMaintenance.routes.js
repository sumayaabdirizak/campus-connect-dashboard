import express from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { requireRole } from "../../middleware/requireRole.js";
import { getDiscussionMetricsSnapshot, metricCount } from "../../features/discussions/reliability/metrics.js";
import {
  DISCUSSION_UPLOAD_DIR,
  DISCUSSION_ARCHIVE_DIR,
} from "../../features/discussions/discussionAttachments.js";

const router = express.Router();

router.post(
  "/maintenance/notifications/archive",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const retentionDays = Math.min(
        90,
        Math.max(30, Number(req.body?.retentionDays ?? process.env.DISCUSSION_NOTIFICATION_RETENTION_DAYS ?? 60))
      );
      const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const result = await prisma.discussionNotification.deleteMany({
        where: {
          createdAt: { lt: threshold },
          readAt: { not: null },
        },
      });
      return res.json({
        archivedCount: result.count,
        retentionDays,
        threshold,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/notifications/archive failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive notifications", null));
    }
  }
);

router.post(
  "/maintenance/attachments/cleanup-orphans",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const maxAgeHours = Math.max(1, Number(req.body?.maxAgeHours ?? 24));
      const threshold = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      const orphans = await prisma.discussionAttachment.findMany({
        where: {
          messageId: null,
          status: "PENDING",
          createdAt: { lt: threshold },
        },
        select: { id: true, storageKey: true },
        take: 2000,
      });
      let removedFiles = 0;
      for (const orphan of orphans) {
        if (orphan.storageKey) {
          const absolutePath = path.resolve(DISCUSSION_UPLOAD_DIR, orphan.storageKey);
          if (fs.existsSync(absolutePath)) {
            try {
              fs.unlinkSync(absolutePath);
              removedFiles += 1;
            } catch {}
          }
        }
      }
      const deleted = await prisma.discussionAttachment.deleteMany({
        where: { id: { in: orphans.map((x) => x.id) } },
      });
      return res.json({
        scanned: orphans.length,
        deletedRows: deleted.count,
        removedFiles,
        maxAgeHours,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/attachments/cleanup-orphans failed", error);
      return res.status(500).json(apiErrorBody("Failed to cleanup orphan attachments", null));
    }
  }
);

router.post(
  "/maintenance/attachments/archive-old",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const olderThanDays = Math.max(30, Number(req.body?.olderThanDays ?? 90));
      const threshold = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const result = await prisma.discussionAttachment.updateMany({
        where: {
          messageId: { not: null },
          status: { not: "ARCHIVED" },
          createdAt: { lt: threshold },
        },
        data: { status: "ARCHIVED" },
      });
      return res.json({
        archivedCount: result.count,
        olderThanDays,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/attachments/archive-old failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive old attachments", null));
    }
  }
);

router.get(
  "/metrics",
  requireRole("SUPER_ADMIN"),
  async (_req, res) => {
    try {
      return res.json(getDiscussionMetricsSnapshot());
    } catch (error) {
      console.error("GET /discussions/metrics failed", error);
      return res.status(500).json(apiErrorBody("Failed to fetch discussion metrics", null));
    }
  }
);

router.post(
  "/maintenance/messages/archive-old",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const olderThanMonths = Math.max(12, Number(req.body?.olderThanMonths ?? 12));
      const threshold = new Date();
      threshold.setMonth(threshold.getMonth() - olderThanMonths);
      if (!fs.existsSync(DISCUSSION_ARCHIVE_DIR)) fs.mkdirSync(DISCUSSION_ARCHIVE_DIR, { recursive: true });

      const rows = await prisma.discussionMessage.findMany({
        where: {
          createdAt: { lt: threshold },
          deletedAt: null,
        },
        include: {
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
        take: Math.min(20000, Number(req.body?.limit ?? 5000)),
      });

      if (rows.length === 0) {
        return res.json({ archivedMessages: 0, threshold, file: null });
      }

      const fileName = `discussion-messages-${Date.now()}.jsonl`;
      const archivePath = path.resolve(DISCUSSION_ARCHIVE_DIR, fileName);
      const stream = fs.createWriteStream(archivePath, { flags: "a" });
      for (const row of rows) {
        stream.write(
          `${JSON.stringify({
            id: row.id,
            groupId: row.groupId,
            senderId: row.senderId,
            messageType: row.messageType,
            createdAt: row.createdAt,
            keyVersion: row.keyVersion,
            senderDeviceId: row.senderDeviceId,
            content: row.content,
            ciphertext: row.ciphertext,
            nonce: row.nonce,
            attachments: row.attachments.map((a) => ({
              id: a.id,
              fileType: a.fileType,
              mimeType: a.mimeType,
              size: Number(a.size),
              storageKey: a.storageKey,
              ciphertextHash: a.ciphertextHash,
              keyVersion: a.keyVersion,
            })),
          })}\n`
        );
      }
      await new Promise((resolve) => stream.end(resolve));

      const messageIds = rows.map((r) => r.id);
      const result = await prisma.discussionMessage.updateMany({
        where: { id: { in: messageIds } },
        data: {
          content: null,
          ciphertext: null,
          nonce: null,
          deletedAt: new Date(),
        },
      });
      metricCount("archive.messages_runs", 1);
      metricCount("archive.messages_count", result.count);

      return res.json({
        archivedMessages: result.count,
        threshold,
        file: archivePath,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/messages/archive-old failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive old messages", null));
    }
  }
);
export default router;
