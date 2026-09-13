import { auth } from './auth.js';

/**
 * Prefixes safe to serve without a session (marketing/covers / public feed images).
 * Everything else under /uploads requires a valid access token (cookie or Bearer).
 *
 * Fine-grained course RBAC still lives on API download routes; this closes
 * anonymous URL guessing for submissions, chat, and assignment files.
 */
const PUBLIC_UPLOAD_PREFIXES = new Set(['covers', 'announcements', 'avatars']);

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireUploadAuth(req, res, next) {
  const key = String(req.path || '').replace(/^\/+/, '');
  if (!key || key.includes('..')) {
    return res.status(404).end();
  }

  const prefix = key.split('/')[0]?.toLowerCase() || '';
  if (PUBLIC_UPLOAD_PREFIXES.has(prefix)) {
    return next();
  }

  return auth(req, res, next);
}
