import { commitUploadedFile } from "../../../../../storage/objectStorage.js";

/** @param {import("express").Request} req */
export async function commitCreateAnnouncementUploads(req) {
  const hostBase = `${req.protocol}://${req.get("host")}`;
  const uploadFiles = req.files || [];
  const committedUploads = [];
  for (const file of uploadFiles) {
    committedUploads.push(
      await commitUploadedFile({
        prefix: "announcements",
        filename: file.filename,
        localPath: file.path,
        contentType: file.mimetype,
        hostBase,
      }),
    );
  }
  return { uploadFiles, committedUploads };
}

/** @param {import("express").Request} req @param {object[]} committedUploads @param {object[]} uploadFiles */
export function parseCreateAnnouncementBody(req, committedUploads) {
  const uploadedImageUrls = committedUploads.map((c) => c.url);
  const bodyImageUrls = req.body.imageUrls
    ? Array.isArray(req.body.imageUrls)
      ? req.body.imageUrls
      : [req.body.imageUrls]
    : [];
  const bodyTargetRoles = req.body.targetRoles
    ? Array.isArray(req.body.targetRoles)
      ? req.body.targetRoles
      : [req.body.targetRoles]
    : [];
  return {
    ...req.body,
    imageUrls: [...bodyImageUrls, ...uploadedImageUrls],
    targetRoles: bodyTargetRoles,
    publishedAt: req.body.publishedAt,
    expiresAt: req.body.expiresAt,
    targets: req.body.targets
      ? typeof req.body.targets === "string"
        ? JSON.parse(req.body.targets)
        : req.body.targets
      : undefined,
    uploadFiles: req.files || [],
    committedUploads,
  };
}
