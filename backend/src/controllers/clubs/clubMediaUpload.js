import fs from 'fs';
import path from 'path';
import multer from 'multer';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function makeImageUpload({ dir, prefix, field }) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (IMAGE_EXTS.has(ext)) return cb(null, true);
      cb(new Error('Only image files (png, jpg, webp, gif) are allowed'));
    },
  });
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
      next();
    });
  };
}

export const clubBannerUploadMw = makeImageUpload({
  dir: './uploads/club-banners',
  prefix: 'club_banner',
  field: 'banner',
});

export const clubIconUploadMw = makeImageUpload({
  dir: './uploads/club-icons',
  prefix: 'club_icon',
  field: 'icon',
});
