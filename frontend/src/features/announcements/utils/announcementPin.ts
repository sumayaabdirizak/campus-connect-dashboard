/**
 * True when the post should behave as "active" (pinned to the top of the feed
 * during its active-days window). Returns true while `expiresAt` is in the
 * future — independent of whether the server has already cleared the
 * `isPinned` flag after the window closed (the expire worker can lag a few
 * seconds; we don't want pinned/unpinned to flicker in the UI).
 *
 * Legacy: an `isPinned=true` row with no `expiresAt` (the old "manual pin"
 * path that's now removed from the UI) is still treated as active until the
 * server data migration drops the flag.
 */
export function isAnnouncementTimelyPinned(a: {
  isPinned?: boolean | null;
  expiresAt?: string | null;
}): boolean {
  if (!a.isPinned) return false;
  if (a.expiresAt == null || a.expiresAt === '') return true;
  const t = new Date(a.expiresAt).getTime();
  if (Number.isNaN(t)) return Boolean(a.isPinned);
  return t > Date.now();
}
