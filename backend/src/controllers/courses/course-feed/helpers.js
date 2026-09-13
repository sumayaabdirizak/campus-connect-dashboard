import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { uploadExtensionFilter } from '../resources.js';

export const FEED_UPLOAD_DIR = './uploads/course-feed';
export const FEED_FILE_LIMIT = 25 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(FEED_UPLOAD_DIR)) fs.mkdirSync(FEED_UPLOAD_DIR, { recursive: true });
    cb(null, FEED_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: FEED_FILE_LIMIT },
  fileFilter: uploadExtensionFilter,
});

export const replyAuthor = { select: { id: true, full_name: true, role: { select: { name: true } } } };

export const postInclude = {
  author: { select: { id: true, full_name: true, role: { select: { name: true } } } },
  attachments: true,
  reactions: { select: { id: true, userId: true, emoji: true } },
  replies: {
    orderBy: { created_at: 'asc' },
    include: { author: replyAuthor },
  },
};
