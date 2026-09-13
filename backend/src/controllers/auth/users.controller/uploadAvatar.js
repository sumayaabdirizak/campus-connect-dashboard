import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { commitUploadedFile } from '../../../storage/objectStorage.js';
import { enforceUploadContentSafety } from '../../courses/resources.js';
import { getMe } from './profile.js';

const AVATAR_DIR = './uploads/avatars';
const AVATAR_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
    cb(null, AVATAR_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (AVATAR_EXTS.has(ext)) return cb(null, true);
    cb(new Error('Only image files (png, jpg, webp) are allowed'));
  },
});

export function avatarUploadMw(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ message: err.message || 'Invalid avatar upload' });
  });
}

export async function uploadMyAvatar(req, res) {
  if (!req.file) throw new HttpError(400, 'No image uploaded');

  const verdict = await enforceUploadContentSafety([req.file]);
  if (!verdict.ok) {
    fs.unlink(req.file.path, () => {});
    throw new HttpError(400, 'File contents do not match an image. Upload rejected.');
  }

  const hostBase = `${req.protocol}://${req.get('host')}`;
  let committed;
  try {
    committed = await commitUploadedFile({
      prefix: 'avatars',
      filename: req.file.filename,
      localPath: req.file.path,
      contentType: req.file.mimetype,
      hostBase,
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('avatar upload storage commit failed', err);
    throw new HttpError(500, 'Failed to store avatar image');
  }

  const url =
    committed.url.replace(/^https?:\/\/[^/]+/i, '') || `/uploads/${committed.storageKey}`;

  await prisma.user.update({
    where: { id: Number(req.user.sub) },
    data: { avatarUrl: url },
  });

  return getMe(req, res);
}

export async function removeMyAvatar(req, res) {
  await prisma.user.update({
    where: { id: Number(req.user.sub) },
    data: { avatarUrl: null },
  });
  return getMe(req, res);
}
