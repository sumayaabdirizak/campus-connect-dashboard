import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = "./uploads/announcements";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

/** Multer middleware for announcement image uploads (max 10 images, 5 MB each). */
export const announcementImageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 10 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});
