/**
 * Storage key building and normalisation utilities.
 */
import path from 'path';

export const UPLOADS_ROOT = path.resolve('./uploads');

export function getStorageDriver() {
  const raw = String(process.env.STORAGE_DRIVER || 'local').trim().toLowerCase();
  return raw === 's3' || raw === 'minio' ? 's3' : 'local';
}

export function isObjectStorageEnabled() {
  return getStorageDriver() === 's3';
}

/** Build a stable object key: `{prefix}/{filename}` (no leading slash). */
export function buildStorageKey(prefix, filename) {
  const cleanPrefix = String(prefix || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.\./g, '');
  const cleanName = path.basename(String(filename || '')).replace(/\.\./g, '');
  if (!cleanName) throw new Error('filename required');
  return cleanPrefix ? `${cleanPrefix}/${cleanName}` : cleanName;
}

/**
 * Normalize a DB storageKey / URL fragment to an object key.
 * Legacy discussion rows used bare filenames under uploads/discussions/.
 */
export function normalizeStorageKey(storageKeyOrFilename, legacyPrefix = null) {
  const raw = String(storageKeyOrFilename || '').trim();
  if (!raw) return null;
  if (raw.startsWith('storage://')) return raw.slice('storage://'.length);
  if (raw.includes('/') || raw.includes('\\')) {
    return raw.replace(/\\/g, '/').replace(/^\/+/, '');
  }
  if (legacyPrefix) return buildStorageKey(legacyPrefix, raw);
  return raw;
}

/**
 * Extract object key from a stored upload URL.
 * Supports `/uploads/…`, absolute URLs with that path, and `storage://…`.
 */
export function keyFromUploadUrl(url, legacyPrefix = null) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('storage://')) {
    return normalizeStorageKey(trimmed);
  }
  try {
    const pathname = trimmed.startsWith('/')
      ? trimmed
      : new URL(trimmed).pathname;
    const marker = '/uploads/';
    const idx = pathname.indexOf(marker);
    if (idx >= 0) {
      return normalizeStorageKey(pathname.slice(idx + marker.length));
    }
  } catch {
    /* fall through */
  }
  const filename = trimmed.split('/').pop();
  return filename ? normalizeStorageKey(filename, legacyPrefix) : null;
}

export function localAbsolutePath(objectKey) {
  const key = normalizeStorageKey(objectKey);
  if (!key || key.includes('..')) throw new Error('Invalid storage key');
  return path.join(UPLOADS_ROOT, key);
}
