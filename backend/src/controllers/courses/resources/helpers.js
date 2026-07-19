import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { normalizeStorageKey } from '../../../storage/objectStorage.js';

export const RESOURCE_STORAGE_PREFIX = 'resources';
export const RESOURCE_UPLOAD_DIR = './uploads/resources';
export const RESOURCE_FILE_LIMIT = 100 * 1024 * 1024; // 100 MB — books / slide decks can be hefty.

export const ALLOWED_EXTENSIONS = new Set([
  // Documents
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.txt', '.md', '.epub',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  // Audio
  '.mp3', '.wav', '.m4a', '.ogg', '.webm',
  // Video
  '.mp4', '.mov', '.webm', '.mkv',
  // Archives
  '.zip',
]);

export const SNIFF_FAMILY_BY_MIME_PREFIX = [
  { prefix: 'application/pdf', family: 'pdf' },
  { prefix: 'image/', family: 'image' },
  { prefix: 'video/', family: 'video' },
  { prefix: 'audio/', family: 'audio' },
  // OOXML / ODF and plain zip — all sniff as application/zip or one of the
  // office MIME types (file-type 19 returns the specific one). We collapse
  // them all into "zip" since they're structurally the same and any zip
  // can wear any of the extensions.
  { prefix: 'application/zip', family: 'zip' },
  { prefix: 'application/vnd.openxmlformats', family: 'zip' },
  { prefix: 'application/vnd.ms-', family: 'zip' },
  { prefix: 'application/epub', family: 'zip' },
  { prefix: 'application/msword', family: 'doc-legacy' },
];

export const EXTENSION_FAMILY = {
  '.pdf': 'pdf',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
  '.gif': 'image', '.webp': 'image',
  '.mp4': 'video', '.mov': 'video', '.mkv': 'video',
  '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio', '.ogg': 'audio',
  // .webm is ambiguous (video vs audio container) — accept either family.
  '.webm': 'media',
  '.zip': 'zip', '.docx': 'zip', '.xlsx': 'zip', '.pptx': 'zip', '.epub': 'zip',
  // Legacy office binaries sniff as application/x-cfb or application/msword.
  '.doc': 'doc-legacy', '.xls': 'doc-legacy', '.ppt': 'doc-legacy',
};

export const NO_SNIFF_EXTENSIONS = new Set(['.txt', '.md', '.svg']);

export function resourceKeyFromUrl(url) {
  if (!url) return null;
  if (String(url).startsWith('storage://')) {
    return normalizeStorageKey(url);
  }
  const filename = String(url).split('/').pop();
  if (!filename) return null;
  return normalizeStorageKey(filename, RESOURCE_STORAGE_PREFIX);
}

export async function verifyContentMatchesExtension(filePath, ext) {
  // Plain-text formats have no magic bytes — extension allowlist alone.
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
  // No mapping for this extension → trust the allowlist (e.g. exotic but
  // approved formats we didn't bother to family-map).
  if (!expectedFamily) return { ok: true };

  if (!sniffed) {
    // file-type returned nothing but the extension is in the family map
    // (so we expected magic bytes). Treat as mismatch — the file is
    // probably a renamed text/script payload.
    return { ok: false, reason: 'no magic bytes' };
  }

  const sniffedFamily = SNIFF_FAMILY_BY_MIME_PREFIX.find((m) =>
    sniffed.mime.startsWith(m.prefix),
  )?.family;

  if (!sniffedFamily) return { ok: false, reason: `unrecognised mime ${sniffed.mime}` };

  // .webm wraps either an audio or video stream — accept both.
  if (expectedFamily === 'media') {
    if (sniffedFamily === 'audio' || sniffedFamily === 'video') return { ok: true };
    return { ok: false, reason: `webm mismatch (${sniffed.mime})` };
  }
  // .doc/.xls/.ppt sniff as application/x-cfb in file-type, which we don't
  // have in the prefix table — accept any application/* match for these.
  if (expectedFamily === 'doc-legacy') {
    if (sniffed.mime.startsWith('application/')) return { ok: true };
    return { ok: false, reason: `office-legacy mismatch (${sniffed.mime})` };
  }
  if (sniffedFamily !== expectedFamily) {
    return { ok: false, reason: `${ext} declared but content sniffed as ${sniffed.mime}` };
  }
  return { ok: true };
}

export function uploadExtensionFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`File type not allowed: ${ext || '(no extension)'}`));
  }
  return cb(null, true);
}

export async function enforceUploadContentSafety(files) {
  for (const f of files) {
    const ext = path.extname(f.filename).toLowerCase();
    const verdict = await verifyContentMatchesExtension(f.path, ext);
    if (!verdict.ok) {
      for (const g of files) {
        try { fs.unlinkSync(g.path); } catch { /* swallow */ }
      }
      return { ok: false, reason: verdict.reason };
    }
  }
  return { ok: true };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(RESOURCE_UPLOAD_DIR)) {
      fs.mkdirSync(RESOURCE_UPLOAD_DIR, { recursive: true });
    }
    cb(null, RESOURCE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Filename is fully server-generated from a CSPRNG — never trust the
    // user's `originalname` for the stored filename (it can contain path
    // traversal, leading dots, or unicode bidi tricks). We preserve only
    // the extension after lowercasing for the content-family check below.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: RESOURCE_FILE_LIMIT },
  fileFilter: uploadExtensionFilter,
});
