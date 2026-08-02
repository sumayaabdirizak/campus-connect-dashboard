import { z } from "zod";
import multer from "multer";
import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { toAnnouncementDto } from "../../../services/announcements/dto/announcementDto.js";
import { updateAnnouncement, normalizeTargetRoles } from "../../../services/announcements/announcementService.js";
import { sendAnnouncementEmailNotifications } from "../../../services/announcements/announcementEmail.service.js";
import { announcementLog } from "../../../services/announcements/announcementLogger.js";
import { attachLikedByCurrentUser } from "../../../services/announcements/announcementReactions.service.js";
import { updateAnnouncementSchema } from "../../../validation/announcementSchemas.js";
import {
  prepareAnnouncementPatchBody,
  syncAnnouncementImagesAfterPatch,
} from "./patch/imageSync.js";

export async function handleAnnouncementPatch(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const { body, uploadFiles, committedUploads } = await prepareAnnouncementPatchBody(req);

    const normalizedTargetRoles = body?.targetRoles
      ? normalizeTargetRoles(
          Array.isArray(body.targetRoles) ? body.targetRoles : [body.targetRoles],
        )
      : undefined;
    const parsed = updateAnnouncementSchema.parse({
      ...body,
      ...(normalizedTargetRoles ? { targetRoles: normalizedTargetRoles } : {}),
      publishedAt: body?.publishedAt,
      expiresAt: body?.expiresAt,
      deadlineAt: body?.deadlineAt,
    });

    const userId = Number(req.user.sub);
    const before = await prisma.announcement.findUnique({ where: { id }, select: { status: true } });
    const result = await updateAnnouncement(id, req.user, parsed);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    const wasDraftOrScheduled =
      before && ["DRAFT", "SCHEDULED"].includes(String(before.status ?? "").toUpperCase());
    const isNowPublished =
      result.announcement && String(result.announcement.status ?? "").toUpperCase() === "PUBLISHED";
    if (wasDraftOrScheduled && isNowPublished) {
      void sendAnnouncementEmailNotifications(prisma, result.announcement).catch((err) => {
        announcementLog("warn", "announcement.email_async_failed", {
          announcementId: id,
          message: err?.message ?? String(err),
        });
      });
    }

    await syncAnnouncementImagesAfterPatch(
      id,
      parsed.imageUrls,
      req,
      uploadFiles,
      committedUploads,
    );

    const [patchedWithLiked] = await attachLikedByCurrentUser(
      result.announcement ? [result.announcement] : [],
      userId,
    );
    return res.json(toAnnouncementDto(patchedWithLiked ?? result.announcement, userId));
  } catch (error) {
    announcementLog("error", "announcement.patch_failed", {
      message: error?.message ?? String(error),
    });
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message === "Only image files are allowed") {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to update announcement", null));
  }
}
