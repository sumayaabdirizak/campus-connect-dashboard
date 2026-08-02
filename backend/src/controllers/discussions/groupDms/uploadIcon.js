import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { commitUploadedFile } from '../../../storage/objectStorage.js';
import { enforceUploadContentSafety } from '../../courses/resources.js';
import { getIo } from '../../../socket/hub.js';
import { getDiscussionCallerUserId } from '../../../features/discussions/discussionCaller.js';
import { getActiveMember } from './helpers.js';

const ICON_DIR = './uploads/group-dm-icons';
const ICON_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true });
    cb(null, ICON_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `group_icon_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ICON_EXTS.has(ext)) return cb(null, true);
    cb(new Error('Only image files (png, jpg, webp) are allowed'));
  },
});

export function groupDmIconUploadMw(req, res, next) {
  upload.single('icon')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json(apiErrorBody(err.message || 'Invalid icon upload', null));
  });
}

async function requireOwner(req, res) {
  const userId = getDiscussionCallerUserId(req);
  if (!userId) {
    res.status(401).json(apiErrorBody('Unauthorized', null));
    return null;
  }
  const self = await getActiveMember(req.params.groupDmId, userId);
  if (!self?.groupDm || self.groupDm.archivedAt) {
    res.status(403).json(apiErrorBody('Forbidden', null));
    return null;
  }
  if (self.role !== 'OWNER') {
    res.status(403).json(apiErrorBody('Only the owner can change this conversation’s icon', null));
    return null;
  }
  return self.groupDm;
}

async function broadcastIconChange(groupDmRow, iconUrl) {
  try {
    const io = getIo();
    if (io) {
      io.to(`groupdm:${groupDmRow.id}`).emit('groupdm:icon', {
        groupDmId: groupDmRow.publicId,
        iconUrl,
      });
    }
  } catch (e) {
    console.warn('groupdm icon socket emit failed', e?.message);
  }
}

export async function uploadGroupDmIcon(req, res) {
  const groupDmRow = await requireOwner(req, res);
  if (groupDmRow == null) return;
  const groupDmId = groupDmRow.id;

  if (!req.file) return res.status(400).json(apiErrorBody('No image uploaded', null));

  const verdict = await enforceUploadContentSafety([req.file]);
  if (!verdict.ok) {
    fs.unlink(req.file.path, () => {});
    return res
      .status(400)
      .json(apiErrorBody('File contents do not match an image. Upload rejected.', null));
  }

  const hostBase = `${req.protocol}://${req.get('host')}`;
  let committed;
  try {
    committed = await commitUploadedFile({
      prefix: 'group-dm-icons',
      filename: req.file.filename,
      localPath: req.file.path,
      contentType: req.file.mimetype,
      hostBase,
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('group dm icon upload storage commit failed', err);
    return res.status(500).json(apiErrorBody('Failed to store icon image', null));
  }

  const url = committed.url.replace(/^https?:\/\/[^/]+/i, '') || `/uploads/${committed.storageKey}`;

  const updated = await prisma.groupDm.update({
    where: { id: groupDmId },
    data: { iconUrl: url },
    select: { id: true, iconUrl: true },
  });

  await broadcastIconChange(groupDmRow, updated.iconUrl);
  return res.json({ groupDm: { id: groupDmRow.publicId, iconUrl: updated.iconUrl } });
}

export async function removeGroupDmIcon(req, res) {
  const groupDmRow = await requireOwner(req, res);
  if (groupDmRow == null) return;
  const groupDmId = groupDmRow.id;

  const updated = await prisma.groupDm.update({
    where: { id: groupDmId },
    data: { iconUrl: null },
    select: { id: true, iconUrl: true },
  });

  await broadcastIconChange(groupDmRow, null);
  return res.json({ groupDm: { id: groupDmRow.publicId, iconUrl: updated.iconUrl } });
}
