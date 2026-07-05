import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { requireRole } from "../../middleware/requireRole.js";
import { getMyAssignments } from './lecturerPortal.controller.js';
import { getMyCourses, getCourseDetail, updateCourseCover } from './teacherCourse.controller.js';

const router = Router();
router.use(requireRole("TEACHER"));

// Cover-image uploads: images only, 5 MB cap, stored under /uploads/covers.
const COVER_DIR = './uploads/covers';
const COVER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(COVER_DIR)) fs.mkdirSync(COVER_DIR, { recursive: true });
    cb(null, COVER_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cover_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (COVER_EXTS.has(ext)) return cb(null, true);
    cb(new Error('Only image files (png, jpg, webp, gif) are allowed'));
  }
});

// Run multer but translate its errors (bad type, too large) into a clean 400
// instead of letting them bubble to the generic error handler.
function coverUploadMw(req, res, next) {
  coverUpload.single('cover')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });
}

router.get('/my-assignments', getMyAssignments);
router.get('/courses', getMyCourses);
router.get('/courses/:offeringId', getCourseDetail);
router.post('/courses/:offeringId/cover', coverUploadMw, updateCourseCover);

export default router;
