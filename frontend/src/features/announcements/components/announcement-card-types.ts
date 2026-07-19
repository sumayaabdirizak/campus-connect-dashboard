import { Announcement } from '../api/types';

export interface AnnouncementCardProps {
  announcement: Announcement;
  onMarkAsRead?: (id: number) => Promise<unknown>;
  canManage?: boolean;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
  onTogglePin?: (announcement: Announcement) => void;
  readTrigger?: 'viewport' | 'click';
  onSnapshotUnreadBeforeRead?: () => void;
  onReadDiagnostic?: (id: number) => void;
  onLightboxDiagnostic?: () => void;
  onResumeDraft?: (id: number) => void | Promise<void>;
  onOpenAnalytics?: (announcement: Announcement) => void;
  posInSet?: number;
  setSize?: number;
}

export function priorityBarClass(priority: Announcement['priority'] | undefined) {
  switch (priority) {
    case 'urgent':
      return 'border-s-destructive/80 bg-gradient-to-r from-destructive/[0.04] to-transparent';
    case 'important':
      return 'border-s-amber-500/80 bg-gradient-to-r from-amber-500/[0.05] to-transparent dark:from-amber-500/10';
    default:
      return 'border-s-transparent';
  }
}
