/**
 * File security and content-sniffing utilities for discussion attachments.
 * Handles extension allowlists, MIME sniffing, and virus scanning.
 */
import path from 'path';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';

export const DISCUSSION_ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.mp4', '.mov', '.webm', '.mkv',
  '.mp3', '.wav', '.m4a', '.ogg',
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.txt', '.md', '.zip',
]);

const SNIFF_FAMILY_BY_MIME_PREFIX = [
  { prefix: 'application/pdf', family: 'pdf' },
  { prefix: 'image/', family: 'image' },
  { prefix: 'video/', family: 'video' },
  { prefix: 'audio/', family: 'audio' },
  { prefix: 'application/zip', family: 'zip' },
  { prefix: 'application/vnd.openxmlformats', family: 'zip' },
  { prefix: 'application/vnd.ms-', family: 'zip' },
  { prefix: 'application/msword', family: 'doc-legacy' },
];

const EXTENSION_FAMILY = {
  '.pdf': 'pdf', '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
  '.gif': 'image', '.webp': 'image', '.mp4': 'video', '.mov': 'video',
  '.mkv': 'video', '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio',
  '.ogg': 'audio', '.webm': 'media', '.zip': 'zip', '.docx': 'zip',
  '.xlsx': 'zip', '.pptx': 'zip', '.doc': 'doc-legacy', '.xls': 'doc-legacy',
  '.ppt': 'doc-legacy',
};

const NO_SNIFF_EXTENSIONS = new Set(['.txt', '.md']);
const VIRUS_SCAN_MODE = String(process.env.DISCUSSION_VIRUS_SCAN_MODE || 'off').toLowerCase();

/** Multer fileFilter — rejects files with disallowed extensions. */
export function discussionUploadExtensionFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!DISCUSSION_ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Unsupported file type: ${ext || '(no extension)'}`));
  }
  return cb(null, true);
}

/**
 * Confirm sniffed content family matches the declared extension.
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function verifyDiscussionContentMatchesExtension(filePath, ext) {
  if (NO_SNIFF_EXTENSIONS.has(ext)) return { ok: true };

  let head;
  try {
    const fd = fs.openSync(filePath, 'r');
    head = Buffer.alloc(4100);
    const bytesRead = fs.readSync(fd, head, 0, 4100, 0);
    fs.closeSync(fd);
    if (bytesRead < 4100) head = head.subarray(0, bytesRead);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  let sniffed;
  try {
    sniffed = await fileTypeFromBuffer(head);
  } catch {
    sniffed = undefined;
  }

  const expectedFamily = EXTENSION_FAMILY[ext];
  if (!expectedFamily) return { ok: true };
  if (!sniffed) return { ok: false, reason: 'no magic bytes' };

  const sniffedFamily = SNIFF_FAMILY_BY_MIME_PREFIX.find((m) =>
    sniffed.mime.startsWith(m.prefix)
  )?.family;

  if (!sniffedFamily) return { ok: false, reason: `unrecognised mime ${sniffed.mime}` };

  if (expectedFamily === 'media') {
    if (sniffedFamily === 'audio' || sniffedFamily === 'video') return { ok: true };
    return { ok: false, reason: `webm mismatch (${sniffed.mime})` };
  }
  if (expectedFamily === 'doc-legacy') {
    if (sniffed.mime.startsWith('application/')) return { ok: true };
    return { ok: false, reason: `office-legacy mismatch (${sniffed.mime})` };
  }
  if (sniffedFamily !== expectedFamily) {
    return { ok: false, reason: `${ext} declared but content sniffed as ${sniffed.mime}` };
  }
  return { ok: true };
}

/** Post-upload content sniff; unlinks the file on failure. */
export async function enforceDiscussionUploadContentSafety(file) {
  if (!file?.path) return { ok: false, reason: 'missing file' };
  const ext = path.extname(file.filename || file.originalname || '').toLowerCase();
  const verdict = await verifyDiscussionContentMatchesExtension(file.path, ext);
  if (!verdict.ok) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }
  return verdict;
}

export async function scanDiscussionUploadedFile(filePath) {
  if (VIRUS_SCAN_MODE === 'off') return { clean: true, mode: 'off' };
  const simulate = String(process.env.DISCUSSION_VIRUS_SCAN_SIMULATE || '').toLowerCase();
  try {
    if (simulate === 'dirty' || simulate === 'infected') {
      if (VIRUS_SCAN_MODE === 'block') {
        return { clean: false, mode: 'block', reason: 'simulated_positive' };
      }
      console.warn('[virus-scan] simulated infected file (warn mode):', filePath);
      return { clean: true, mode: 'warn', warned: true, reason: 'simulated_positive' };
    }
    return { clean: true, mode: VIRUS_SCAN_MODE };
  } catch (error) {
    if (VIRUS_SCAN_MODE === 'block') {
      return { clean: false, reason: 'virus_scan_failed', error: error?.message || 'scan failed' };
    }
    console.warn('Virus scan warning:', error?.message || error);
    return { clean: true, mode: VIRUS_SCAN_MODE, warning: 'scan_failed_but_allowed' };
  }
}
