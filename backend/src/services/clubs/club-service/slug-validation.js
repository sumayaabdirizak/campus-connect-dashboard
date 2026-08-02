import { ClubServiceError } from './errors.js';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'dean', 'faculty', 'super', 'super-admin',
  'mod', 'moderator', 'system', 'support', 'staff', 'official',
  'create', 'new', 'invite', 'invites', 'requests', 'me', 'mine',
  'recommended', 'pending', 'archive', 'archived', 'banned',
]);

export function validateSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!SLUG_RE.test(s)) {
    throw new ClubServiceError('Slug must be 3-32 chars, lowercase letters/numbers/hyphens.', {
      code: 'CLUB_SLUG_INVALID',
      status: 400,
    });
  }
  if (RESERVED_SLUGS.has(s)) {
    throw new ClubServiceError(`Slug "${s}" is reserved.`, {
      code: 'CLUB_SLUG_RESERVED',
      status: 400,
    });
  }
  return s;
}
