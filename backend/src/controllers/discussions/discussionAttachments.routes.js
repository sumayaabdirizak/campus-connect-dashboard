import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { checkDiscussionUploadRateLimit } from "../../features/discussions/uploadRateLimit.js";
import {
  PERMISSION_BITS,
  computeChannelPermissions,
  hasPermission,
} from "../../features/discussions/permissions.js";
import { requireActiveDiscussionMembership } from "../../features/discussions/discussionMembership.js";
import {
  DISCUSSION_UPLOAD_DIR,
  DISCUSSION_FILE_SIZE_LIMITS,
  discussionAttachmentUpload,
  discussionAttachmentTypeFromMime,
  parseDiscussionAttachmentToken,
  toDiscussionAttachmentDto,
  scanDiscussionUploadedFile,
  buildDiscussionAttachmentAccessUrl as buildAttachmentAccessUrl,
  DISCUSSION_ATTACHMENT_URL_TTL_SECONDS as ATTACHMENT_URL_TTL_SECONDS,
} from "../../features/discussions/discussionAttachments.js";

const router = express.Router();

router.post("/uploads", discussionAttachmentUpload.single("file"), async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupIdRaw = Number(req.body?.groupId);
    const channelIdRaw = Number(req.body?.channelId);
    let resolvedGroupId = null;
    let e2eeRequired = false;

    if (Number.isInteger(channelIdRaw) && channelIdRaw > 0) {
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelIdRaw },
        select: {
          id: true,
          serverId: true,
          server: { select: { e2eeEnabled: true } },
        },
      });
      if (!channel) {
        return res.status(404).json(apiErrorBody("Channel not found", null));
      }
      const perms = await computeChannelPermissions({ userId, channelId: channelIdRaw });
      if (!hasPermission(perms, PERMISSION_BITS.SEND_MESSAGES)) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      resolvedGroupId = channel.serverId;
      e2eeRequired = channel.server?.e2eeEnabled !== false;
    } else if (Number.isInteger(groupIdRaw) && groupIdRaw > 0) {
      const membership = await requireActiveDiscussionMembership(groupIdRaw, userId);
      if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
      resolvedGroupId = groupIdRaw;
      e2eeRequired = membership.group?.e2eeEnabled !== false;
    } else {
      return res.status(400).json(apiErrorBody("groupId or channelId is required", null));
    }

    if (!(await checkDiscussionUploadRateLimit(userId))) {
      return res.status(429).json(apiErrorBody("Upload rate limit exceeded", null));
    }
    if (e2eeRequired) {
      if (!req.body?.ciphertextHash || !req.body?.keyVersion || !req.body?.nonce) {
        return res.status(400).json(
          apiErrorBody(
            "Encrypted uploads require ciphertextHash, keyVersion, and nonce metadata",
            null
          )
        );
      }
    }
    if (!req.file) {
      return res.status(400).json(apiErrorBody("file is required", null));
    }

    const fileType = discussionAttachmentTypeFromMime(req.file.mimetype);
    const maxSize = DISCUSSION_FILE_SIZE_LIMITS[fileType];
    if (req.file.size > maxSize) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
      return res
        .status(413)
        .json(apiErrorBody(`File too large for ${fileType}. Max ${Math.round(maxSize / 1024 / 1024)}MB`, null));
    }

    const scanResult = await scanDiscussionUploadedFile(req.file.path);
    if (!scanResult.clean) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
      return res.status(400).json(apiErrorBody("Uploaded file failed security scan", null));
    }

    const hostBase = `${req.protocol}://${req.get("host")}`;
    const url = `${hostBase}/uploads/discussions/${req.file.filename}`;
    const attachment = await prisma.discussionAttachment.create({
      data: {
        uploadedById: userId,
        groupId: resolvedGroupId,
        url,
        storageKey: req.file.filename,
        fileType,
        mimeType: req.file.mimetype,
        size: BigInt(req.file.size),
        status: "PENDING",
        ciphertextHash: req.body?.ciphertextHash ? String(req.body.ciphertextHash) : null,
        keyVersion: req.body?.keyVersion ? Number(req.body.keyVersion) : null,
        nonce: req.body?.nonce ? String(req.body.nonce) : null,
      },
    });

    return res.status(201).json(toDiscussionAttachmentDto(req, attachment, userId));
  } catch (error) {
    console.error("POST /discussions/uploads failed", error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json(apiErrorBody(error.message, null));
    }
    if (error instanceof Error && error.message === "Unsupported file type") {
      return res.status(415).json(apiErrorBody(error.message, null));
    }
    return res.status(500).json(apiErrorBody("Failed to upload attachment", null));
  }
});

router.get("/attachments/:id/access-url", async (req, res) => {
  try {
    const attachmentId = Number(req.params.id);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(attachmentId)) {
      return res.status(400).json(apiErrorBody("Invalid attachment id", null));
    }
    const attachment = await prisma.discussionAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, groupId: true, uploadedById: true },
    });
    if (!attachment) return res.status(404).json(apiErrorBody("Attachment not found", null));
    if (attachment.groupId) {
      const membership = await requireActiveDiscussionMembership(attachment.groupId, userId);
      if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    } else if (attachment.uploadedById !== userId) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }
    return res.json({
      attachmentId,
      accessUrl: buildAttachmentAccessUrl(req, attachmentId, userId),
      expiresInSeconds: ATTACHMENT_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error("GET /discussions/attachments/:id/access-url failed", error);
    return res.status(500).json(apiErrorBody("Failed to generate attachment URL", null));
  }
});

router.get("/attachments/:id/download", async (req, res) => {
  try {
    const attachmentId = Number(req.params.id);
    const tokenPayload = parseDiscussionAttachmentToken(req.query?.token);
    if (!Number.isFinite(attachmentId) || !tokenPayload || tokenPayload.attachmentId !== attachmentId) {
      return res.status(401).json(apiErrorBody("Invalid or expired attachment token", null));
    }
    const attachment = await prisma.discussionAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        groupId: true,
        uploadedById: true,
        storageKey: true,
        mimeType: true,
      },
    });
    if (!attachment) return res.status(404).json(apiErrorBody("Attachment not found", null));
    if (attachment.groupId) {
      const membership = await requireActiveDiscussionMembership(attachment.groupId, tokenPayload.userId);
      if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    } else if (attachment.uploadedById !== tokenPayload.userId) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }
    if (!attachment.storageKey) {
      return res.status(410).json(apiErrorBody("Attachment binary is unavailable", null));
    }
    const absolutePath = path.resolve(DISCUSSION_UPLOAD_DIR, attachment.storageKey);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json(apiErrorBody("Attachment file not found", null));
    }
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error("GET /discussions/attachments/:id/download failed", error);
    return res.status(500).json(apiErrorBody("Failed to download attachment", null));
  }
});
export default router;
