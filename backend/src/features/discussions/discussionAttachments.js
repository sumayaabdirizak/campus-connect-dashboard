/**
 * Discussion attachment module — multer setup, token signing, URL building,
 * and DTO helpers. Security/validation utilities are in discussionAttachmentSecurity.js.
 */
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getSigningSecret } from '../../utils/signingSecret.js';
import {
  DISCUSSION_ALLOWED_EXTENSIONS,
  discussionUploadExtensionFilter,
  verifyDiscussionContentMatchesExtension,
  enforceDiscussionUploadContentSafety,
  scanDiscussionUploadedFile,
} from './discussionAttachmentSecurity.js';

export const DISCUSSION_UPLOAD_DIR = './uploads/discussions';
export const DISCUSSION_ARCHIVE_DIR = './uploads/discussions-archive';

export const DISCUSSION_FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
  FILE: 25 * 1024 * 1024,
};

// Re-export security utilities so callers can import from either module.
export {
  DISCUSSION_ALLOWED_EXTENSIONS,
  discussionUploadExtensionFilter,
  verifyDiscussionContentMatchesExtension,
  enforceDiscussionUploadContentSafety,
  scanDiscussionUploadedFile,
};

const ATTACHMENT_SIGNING_SECRET = getSigningSecret('DISCUSSION_ATTACHMENT_SIGNING_SECRET');
export const DISCUSSION_ATTACHMENT_URL_TTL_SECONDS = Number(
  process.env.DISCUSSION_ATTACHMENT_URL_TTL_SECONDS || 900
);

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync(DISCUSSION_UPLOAD_DIR)) fs.mkdirSync(DISCUSSION_UPLOAD_DIR, { recursive: true });
    cb(null, DISCUSSION_UPLOAD_DIR);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

export const discussionAttachmentUpload = multer({
  storage,
  limits: { fileSize: DISCUSSION_FILE_SIZE_LIMITS.VIDEO },
  fileFilter: discussionUploadExtensionFilter,
});

export function discussionAttachmentTypeFromMime(mimeType) {
  if (String(mimeType).startsWith('image/')) return 'IMAGE';
  if (String(mimeType).startsWith('video/')) return 'VIDEO';
  return 'FILE';
}

/** Prefer sniffed MIME when available; fall back to client MIME. */
export function discussionAttachmentTypeFromFile(file) {
  const name = String(file?.filename || file?.originalname || '');
  const ext = path.extname(name).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'IMAGE';
  if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) return 'VIDEO';
  return discussionAttachmentTypeFromMime(file?.mimetype);
}

export function signDiscussionAttachmentToken({ attachmentId, userId, expiresAt }) {
  const payload = `${Number(attachmentId)}.${Number(userId)}.${Number(expiresAt)}`;
  const sig = crypto.createHmac('sha256', ATTACHMENT_SIGNING_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64url');
}

export function parseDiscussionAttachmentToken(token) {
  try {
    const decoded = Buffer.from(String(token || ''), 'base64url').toString('utf8');
    const [attachmentIdRaw, userIdRaw, expiresAtRaw, signature] = decoded.split('.');
    const attachmentId = Number(attachmentIdRaw);
    const userId = Number(userIdRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(attachmentId) || !Number.isFinite(userId) || !Number.isFinite(expiresAt)) {
      return null;
    }
    const payload = `${attachmentId}.${userId}.${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', ATTACHMENT_SIGNING_SECRET)
      .update(payload)
      .digest('hex');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(String(signature || ''), 'utf8');
    if (
      expectedBuf.length !== actualBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, actualBuf)
    ) {
      return null;
    }
    if (Date.now() > expiresAt) return null;
    return { attachmentId, userId, expiresAt };
  } catch {
    return null;
  }
}

export function buildDiscussionAttachmentAccessUrl(
  req,
  attachmentId,
  userId,
  ttlSeconds = DISCUSSION_ATTACHMENT_URL_TTL_SECONDS
) {
  const expiresAt = Date.now() + Math.max(60, ttlSeconds) * 1000;
  const token = signDiscussionAttachmentToken({ attachmentId, userId, expiresAt });
  return `${req.protocol}://${req.get('host')}/api/discussions/attachments/${attachmentId}/download?token=${token}`;
}

export function toDiscussionAttachmentDto(req, attachment, userId) {
  return {
    id: attachment.id,
    groupId: attachment.groupId,
    url: attachment.url,
    accessUrl: buildDiscussionAttachmentAccessUrl(req, attachment.id, userId),
    fileType: attachment.fileType,
    mimeType: attachment.mimeType,
    size: Number(attachment.size),
    status: attachment.status,
    createdAt: attachment.createdAt,
    isE2EE: Boolean(attachment.ciphertextHash != null || attachment.keyVersion != null),
  };
}

/** Adds signed accessUrl + isE2EE on channel message attachment arrays. */
export function enrichDiscussionMessagesAttachments(req, messages, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return messages;
  return messages.map((m) => ({
    ...m,
    attachments: (m.attachments ?? []).map((a) => ({
      ...a,
      size: Number(a.size),
      accessUrl: buildDiscussionAttachmentAccessUrl(req, a.id, uid),
      isE2EE: Boolean(a.ciphertextHash != null || a.keyVersion != null),
    })),
  }));
}
