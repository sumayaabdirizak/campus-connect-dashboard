import { prisma } from "../../../../db/prisma.js";
import { announcementLog } from "../../../../services/announcements/announcementLogger.js";

/** @param {number} announcementId @param {import("express").Request} req @param {object[]} uploadFiles @param {object[]} committedUploads */
export async function persistCreateAnnouncementAttachments(announcementId, req, uploadFiles, committedUploads) {
  if (!committedUploads.length) return;
  const rawAlts = req.body.imageAltTexts;
  const altList = Array.isArray(rawAlts) ? rawAlts : rawAlts != null ? [rawAlts] : [];
  const attachmentRows = uploadFiles.map((file, idx) => ({
    announcementId,
    kind: "IMAGE",
    url: committedUploads[idx].url,
    mimeType: file.mimetype,
    size: BigInt(file.size ?? 0),
    storageKey: committedUploads[idx].storageKey,
    altText: typeof altList[idx] === "string" ? altList[idx].trim() || null : null,
  }));
  if (!attachmentRows.length) return;
  try {
    await prisma.announcementAttachment.createMany({ data: attachmentRows });
  } catch (err) {
    announcementLog("warn", "announcement.attachment_persist_failed", {
      announcementId,
      message: err?.message ?? String(err),
    });
  }
}
