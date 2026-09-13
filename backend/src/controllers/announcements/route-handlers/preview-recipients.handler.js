import { prisma } from "../../../db/prisma.js";
import { z } from "zod";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { normalizeTargetRoles } from "../../../services/announcements/announcementService.js";
import { findAnnouncementRecipientUserIds } from "../../../services/announcements/announcementRecipients.service.js";
import { announcementLog } from "../../../services/announcements/announcementLogger.js";
import { previewRecipientsSchema } from "../../../validation/announcementSchemas.js";
import { buildPreviewRecipientShards } from "./preview-recipients/buildShards.js";

export async function handleAnnouncementPreviewRecipients(req, res) {
  try {
    const parsed = previewRecipientsSchema.parse({
      targetType: req.query.targetType,
      facultyId: req.query.facultyId || undefined,
      departmentId: req.query.departmentId || undefined,
      batchId: req.query.batchId || undefined,
      sectionId: req.query.sectionId || undefined,
      departmentIds: req.query.departmentIds,
      batchIds: req.query.batchIds,
      sectionIds: req.query.sectionIds,
      targetRoles: req.query.targetRoles,
    });

    const targetRoles = normalizeTargetRoles(
      Array.isArray(parsed.targetRoles)
        ? parsed.targetRoles
        : typeof parsed.targetRoles === "string" && parsed.targetRoles.length > 0
          ? parsed.targetRoles.split(",")
          : ["STUDENT", "TEACHER"],
    );

    const shards = buildPreviewRecipientShards(parsed);
    const userIdSet = new Set();
    for (const shard of shards) {
      const ids = await findAnnouncementRecipientUserIds(prisma, { ...shard, targetRoles });
      ids.forEach((id) => userIdSet.add(id));
    }

    const userIds = Array.from(userIdSet);
    const sampleIds = userIds.slice(0, 5);
    const sample = sampleIds.length
      ? await prisma.user.findMany({
          where: { id: { in: sampleIds } },
          select: { id: true, full_name: true },
          take: 5,
        })
      : [];

    res.json({
      count: userIds.length,
      sample: sample.map((u) => ({ id: u.id, name: u.full_name })),
      targetType: parsed.targetType,
      targetRoles,
      shardCount: shards.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    announcementLog("error", "announcement.preview_recipients_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to preview recipients", null));
  }
}
