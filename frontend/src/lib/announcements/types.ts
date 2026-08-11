import type { Role } from '@/types/auth';

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type AnnouncementTargetType = 'ALL' | 'FACULTY' | 'DEPARTMENT' | 'BATCH' | 'SECTION';
export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';

export type AnnouncementTargetRow = {
  scopeType: 'FACULTY' | 'DEPARTMENT' | 'BATCH' | 'SECTION';
  scopeId: number;
};

export interface AnnouncementAuthor {
  id: string;
  full_name: string;
  role: {
    name: string;
    type: Role;
  };
  avatarUrl?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'document' | 'video';
  thumbnailUrl?: string;
  /** WCAG 1.1.1 short description. Empty when the image is decorative. */
  altText?: string;
}

export interface CreateAnnouncementDTO {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  targetType?: AnnouncementTargetType;
  facultyId?: number;
  departmentId?: number;
  batchId?: number;
  sectionId?: number;
  imageUrls?: string[];
  attachments?: File[];
  attachmentUrls?: string[];
  targetRoles?: string[];
  publishedAt?: string | null;
  expiresAt?: string | null;
  /** Shown on dashboard calendar (e.g. submission deadline). */
  deadlineAt?: string | null;
  targets?: AnnouncementTargetRow[];
  bodyMarkdown?: string;
  bodyHtml?: string;
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  acknowledgementRequired?: boolean;
  commentsEnabled?: boolean;
  isPinned?: boolean;
}

export interface Announcement {
  id: string | number;
  title: string;
  content: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  priority: AnnouncementPriority;
  targetType?: AnnouncementTargetType;
  status?: AnnouncementStatus;
  /** Server targeting; used for visibility diagnostics. */
  targeting?: {
    facultyId?: number | null;
    departmentId?: number | null;
    batchId?: number | null;
    sectionId?: number | null;
  };
  targets?: AnnouncementTargetRow[];
  targetRoles?: string[];
  isActive?: boolean;
  expiresAt?: string | null;
  deadlineAt?: string | null;
  version?: number;
  slug?: string;
  acknowledgementRequired?: boolean;
  commentsEnabled?: boolean;

  imageUrls?: string[];
  attachments?: Attachment[];

  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
  createdBy: {
    id: string;
    name: string;
    role: Role;
    avatarUrl?: string;
  };

  isPinned?: boolean;
  isRead?: boolean;
  /** Heart reaction count (API; feed UI does not surface this). */
  likes?: number;
  /** Top-level comments count (API; feed UI does not surface this). */
  commentsCount?: number;
  /** Whether the current user has placed the canonical heart reaction. */
  likedByCurrentUser?: boolean;
  /** Unread and created within the configured "new" window (matches API). */
  isNew?: boolean;

  created_at?: string;
  authorId?: number;
  author?: AnnouncementAuthor;
  reads?: { id: number; userId: number }[];
}

/** Mirrors `GET /api/announcements/:id/analytics` (schemaVersion 1). */
export interface AnnouncementAnalyticsPayload {
  schemaVersion: number;
  announcementId: number;
  title: string;
  publishedAt: string | null;
  generatedAt: string;
  eligibleRecipients: number;
  impressionsLive: number;
  uniqueReaders: number;
  likes: number;
  linkClicks: number;
  readRate: number | null;
  readTimeSeries: { bucketStart: string; newReaders: number; cumulativeReaders: number }[];
  acknowledgement: {
    required: boolean;
    acknowledgedCount: number;
    eligibleCount: number;
    completionRate: number | null;
  } | null;
  snapshots: {
    snapshotAt: string;
    impressions: number;
    uniqueReaders: number;
    readRate: number | null;
    likes: number;
    acknowledgedCount: number;
    linkClicks: number;
  }[];
}
