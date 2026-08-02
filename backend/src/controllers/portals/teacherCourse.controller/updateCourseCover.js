import fs from "fs";
import { prisma } from "../../../db/prisma.js";
import { enforceUploadContentSafety } from "../../courses/resources.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { commitUploadedFile } from "../../../storage/objectStorage.js";

/**
 * POST /api/lecturer-portal/courses/:offeringId/cover
 * Teacher uploads a cover image for a course they teach. The image is stored
 * under /uploads/covers and persisted to Course.thumbnail. Scope is enforced
 * by matching the offering's teacherId to the caller, so a teacher can only
 * change the cover of courses they actually teach. Note: thumbnail lives on
 * the shared Course record, so the cover applies to every section of it.
 */
export const updateCourseCover = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const userId = Number(req.user.sub);

    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const offering = await prisma.courseOffering.findFirst({
      where: { publicId: offeringId, teacherId: userId },
      select: { courseId: true }
    });
    if (!offering) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Course not found or you do not teach it' });
    }

    // Content-sniff the upload — the extension filter only trusts the filename;
    // this confirms the bytes are actually an image before we expose the URL.
    const verdict = await enforceUploadContentSafety([req.file]);
    if (!verdict.ok) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'File contents do not match an image. Upload rejected.' });
    }

    const hostBase = `${req.protocol}://${req.get("host")}`;
    let committed;
    try {
      committed = await commitUploadedFile({
        prefix: "covers",
        filename: req.file.filename,
        localPath: req.file.path,
        contentType: req.file.mimetype,
        hostBase,
      });
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      console.error("cover upload storage commit failed", err);
      return res.status(500).json({ message: "Failed to store cover image" });
    }

    // Persist a host-stable path (`/uploads/covers/...`) for FE rewrites.
    const url = committed.url.replace(/^https?:\/\/[^/]+/i, "") || `/uploads/${committed.storageKey}`;

    const course = await prisma.course.update({
      where: { id: offering.courseId },
      data: { thumbnail: url },
      select: { id: true, name: true, code: true, thumbnail: true }
    });

    res.json({ success: true, course });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to update course cover', e);
  }
};
