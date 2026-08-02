import { prisma } from "../../../../../db/prisma.js";
import { announcementLog } from "../../../announcementLogger.js";
import {
  commitCreateAnnouncementUploads,
  parseCreateAnnouncementBody,
} from "../create/uploadHelpers.js";
import { persistCreateAnnouncementAttachments } from "../create/persistAttachments.js";

/**
 * Merge kept imageUrls + newly uploaded files for PATCH (multipart or JSON).
 * @param {import("express").Request} req
 */
export async function prepareAnnouncementPatchBody(req) {
  const isMultipart = String(req.headers?.["content-type"] ?? "").includes("multipart/form-data");
  if (!isMultipart && !req.files?.length) {
    return { body: req.body, uploadFiles: [], committedUploads: [] };
  }
  const { uploadFiles, committedUploads } = await commitCreateAnnouncementUploads(req);
  const body = parseCreateAnnouncementBody(req, committedUploads);
  const {
    uploadFiles: _uf,
    committedUploads: _cu,
    notifySms: _ns,
    ...safeBody
  } = body;
  return { body: safeBody, uploadFiles, committedUploads };
}

/**
 * After update: persist new upload rows; drop IMAGE attachments no longer in imageUrls.
 * @param {number} announcementId
 * @param {string[] | undefined} finalImageUrls
 * @param {import("express").Request} req
 * @param {object[]} uploadFiles
 * @param {object[]} committedUploads
 */
export async function syncAnnouncementImagesAfterPatch(
  announcementId,
  finalImageUrls,
  req,
  uploadFiles,
  committedUploads,
) {
  if (finalImageUrls === undefined && !committedUploads.length) return;

  await persistCreateAnnouncementAttachments(
    announcementId,
    req,
    uploadFiles,
    committedUploads,
  );

  if (finalImageUrls === undefined) return;

  const keep = new Set(
    finalImageUrls.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim()),
  );
  try {
    const existing = await prisma.announcementAttachment.findMany({
      where: { announcementId, kind: "IMAGE" },
      select: { id: true, url: true },
    });
    const toDelete = existing.filter((row) => !keep.has(row.url)).map((row) => row.id);
    if (toDelete.length) {
      await prisma.announcementAttachment.deleteMany({ where: { id: { in: toDelete } } });
    }
  } catch (err) {
    announcementLog("warn", "announcement.attachment_sync_failed", {
      announcementId,
      message: err?.message ?? String(err),
    });
  }
}
