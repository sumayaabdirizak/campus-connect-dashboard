import type { Announcement } from '../../api/types';

export const PAGE_SIZE = 10;

export type SortMode = 'NEWEST' | 'OLDEST' | 'PRIORITY';

export type FeedTab = 'all' | 'pinned' | 'saved' | 'drafts';

export type ReadFilter = 'ALL' | 'READ' | 'UNREAD';

export type DateFilter = 'ALL' | '7D' | '30D';

export const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  important: 1,
  normal: 2
};

export interface AnnouncementFeedProps {
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  userRole?: string;
  unreadCount: number;
  /** Count of the current user's drafts (managers only); shown on Create. */
  draftCount?: number;
  canManage?: boolean;
  canCreate?: boolean;
  onOpenCreate: () => void;
  onEditAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (announcement: Announcement) => void;
  onTogglePinAnnouncement?: (announcement: Announcement) => void;
  onMarkAsRead?: (id: number) => Promise<unknown>;
  /** Draft tab: fetch full announcement then open composer (GET /announcements/:id). */
  onResumeDraft?: (id: number) => void | Promise<void>;
  /** Dean / super-admin: open analytics side sheet from card menu. */
  onOpenAnalytics?: (announcement: Announcement) => void;
  readTrigger?: 'viewport' | 'click';
  onSnapshotUnreadBeforeRead?: () => void;
  onReadDiagnostic?: (id: number) => void;
  onLightboxDiagnostic?: () => void;
}
