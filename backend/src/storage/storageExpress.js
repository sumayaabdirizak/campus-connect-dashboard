/**
 * Express response helpers for stored files.
 */
import { resolveDownload } from './storageOps.js';

/**
 * Express helper: redirect to signed URL or res.download / sendFile.
 */
export async function sendStoredFile(
  res,
  storageKey,
  { legacyPrefix = null, downloadName = null, contentType = null, inline = false } = {}
) {
  const resolved = await resolveDownload(storageKey, {
    legacyPrefix,
    downloadName: inline ? null : downloadName,
    contentType,
  });
  if (!resolved) {
    res.status(404).json({ message: 'File not found' });
    return;
  }
  if (resolved.mode === 'redirect') {
    res.redirect(302, resolved.url);
    return;
  }
  if (contentType) res.setHeader('Content-Type', contentType);
  if (downloadName && !inline) {
    return res.download(resolved.path, downloadName);
  }
  return res.sendFile(resolved.path);
}
