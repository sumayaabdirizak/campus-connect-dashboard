import { z } from "zod";
import multer from "multer";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { toAnnouncementDto } from "../../dto/announcementDto.js";
import { createAnnouncement, normalizeTargetRoles } from "../announcementService.js";
import { sendAnnouncementSmsNotifications } from "../announcementSms.service.js";
import { sendAnnouncementEmailNotifications } from "../announcementEmail.service.js";
import { announcementLog } from "../../announcementLogger.js";
import { attachLikedByCurrentUser } from "../announcementReactions.service.js";
import { createAnnouncementSchema } from "../../validation/announcementSchemas.js";
import {
  commitCreateAnnouncementUploads,
  parseCreateAnnouncementBody,
} from "./create/uploadHelpers.js";
import { persistCreateAnnouncementAttachments } from "./create/persistAttachments.js";

export async function handleAnnouncementCreate(req, res) {
  try {
    const createdById = Number(req.user.sub);
    const { uploadFiles, committedUploads } = await commitCreateAnnouncementUploads(req);
    const body = parseCreateAnnouncementBody(req, committedUploads);
    const parsed = createAnnouncementSchema.parse({
      ...body,
      targetRoles: normalizeTargetRoles(body.targetRoles),
    });

    const result = await createAnnouncement(req.user, parsed);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    if (result.announcement) {
      await persistCreateAnnouncementAttachments(
        result.announcement.id,
        req,
        uploadFiles,
        committedUploads,
      );
    }

    const [createdWithLiked] = await attachLikedByCurrentUser(
      result.announcement ? [result.announcement] : [],
      createdById,
    );
    if (parsed.notifySms === true && result.announcement) {
      void sendAnnouncementSmsNotifications(prisma, result.announcement, { notifySms: true }).catch((err) => {
        announcementLog("warn", "announcement.sms_async_failed", {
          announcementId: result.announcement.id,
          message: err?.message ?? String(err),
        });
      });
    }
    if (result.announcement && String(result.announcement.status ?? "").toUpperCase() === "PUBLISHED") {
      void sendAnnouncementEmailNotifications(prisma, result.announcement).catch((err) => {
        announcementLog("warn", "announcement.email_async_failed", {
          announcementId: result.announcement.id,
          message: err?.message ?? String(err),
        });
      });
    }
    res.status(201).json(toAnnouncementDto(createdWithLiked ?? result.announcement, createdById));
  } catch (error) {
    announcementLog("error", "announcement.create_failed", { message: error?.message ?? String(error) });
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message === "Only image files are allowed") {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    res.status(500).json(apiErrorBody("Failed to create announcement", null));
  }
}
