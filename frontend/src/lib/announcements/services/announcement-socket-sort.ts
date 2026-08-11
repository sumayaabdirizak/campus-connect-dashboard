import type { Announcement } from '../types';
import { isAnnouncementTimelyPinned } from './announcementPin';

const IS_NEW_DAYS = Number(process.env.NEXT_PUBLIC_ANNOUNCEMENT_NEW_DAYS) || 7;

function isAnnouncementNewForSort(a: Announcement): boolean {
  if (a.isRead) return false;
  const created = a.createdAt || a.created_at;
  if (!created) return false;
  const ageMs = Date.now() - new Date(created).getTime();
  return ageMs >= 0 && ageMs < IS_NEW_DAYS * 24 * 60 * 60 * 1000;
}

/** Scheduled tab cache: soonest publish time first (matches `AnnouncementFeed`). */
export function sortScheduledList(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    const at = new Date(a.publishedAt || a.createdAt || a.created_at || 0).getTime();
    const bt = new Date(b.publishedAt || b.createdAt || b.created_at || 0).getTime();
    return at - bt;
  });
}

/** Same ordering as the API list: pinned → new → createdAt desc */
export function sortAnnouncementsForDisplay(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    const ap = isAnnouncementTimelyPinned(a);
    const bp = isAnnouncementTimelyPinned(b);
    if (ap !== bp) return ap ? -1 : 1;
    const aNew = isAnnouncementNewForSort(a);
    const bNew = isAnnouncementNewForSort(b);
    if (aNew !== bNew) return aNew ? -1 : 1;
    const ac = new Date(a.createdAt || a.created_at || 0).getTime();
    const bc = new Date(b.createdAt || b.created_at || 0).getTime();
    return bc - ac;
  });
}
