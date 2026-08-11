import type { Announcement } from '@/lib/announcements/types';
import { isAnnouncementTimelyPinned } from '@/lib/announcements/services/announcementPin';
import type { DateFilter, FeedTab, ReadFilter, SortMode } from './types';
import { PRIORITY_WEIGHT } from './types';

export function filterAndSortAnnouncements(
  announcements: Announcement[],
  opts: {
    currentFilter: FeedTab;
    searchQuery: string;
    readFilter: ReadFilter;
    dateFilter: DateFilter;
    sortMode: SortMode;
    savedIds: Set<string>;
  }
): Announcement[] {
  const { currentFilter, searchQuery, readFilter, dateFilter, sortMode, savedIds } = opts;
  const filtered = announcements.filter((announcement) => {
    if (currentFilter === 'pinned' && !isAnnouncementTimelyPinned(announcement)) return false;
    if (currentFilter === 'saved' && !savedIds.has(String(announcement.id))) return false;
    if (currentFilter === 'drafts') {
      if (String(announcement.status ?? '').toUpperCase() !== 'DRAFT') return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const textMatch =
        announcement.title?.toLowerCase().includes(q) ||
        announcement.content?.toLowerCase().includes(q);
      if (!textMatch) return false;
    }
    if (readFilter === 'READ' && !announcement.isRead) return false;
    if (readFilter === 'UNREAD' && announcement.isRead) return false;
    if (dateFilter !== 'ALL') {
      const ts = new Date(announcement.publishedAt || announcement.createdAt || 0).getTime();
      const days = dateFilter === '7D' ? 7 : 30;
      if (!Number.isFinite(ts) || Date.now() - ts > days * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  const compareNewest = (a: Announcement, b: Announcement) =>
    new Date(b.publishedAt || b.createdAt || 0).getTime() -
    new Date(a.publishedAt || a.createdAt || 0).getTime();
  const compareOldest = (a: Announcement, b: Announcement) => -compareNewest(a, b);
  const comparePriority = (a: Announcement, b: Announcement) => {
    const aw = PRIORITY_WEIGHT[a.priority] ?? 99;
    const bw = PRIORITY_WEIGHT[b.priority] ?? 99;
    if (aw !== bw) return aw - bw;
    return compareNewest(a, b);
  };
  const compare =
    sortMode === 'OLDEST'
      ? compareOldest
      : sortMode === 'PRIORITY'
        ? comparePriority
        : compareNewest;

  const pinned = filtered.filter((a) => isAnnouncementTimelyPinned(a)).sort(compare);
  const rest = filtered.filter((a) => !isAnnouncementTimelyPinned(a)).sort(compare);
  return [...pinned, ...rest];
}
