export type ResourceType =
  | 'SYLLABUS'
  | 'ASSIGNMENT'
  | 'LECTURE_NOTE'
  | 'VIDEO'
  | 'AUDIO'
  | 'EXTERNAL_LINK'
  | 'OTHER';

export interface Resource {
  id: number;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  originalName: string | null;
  mimeType: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  courseId: number;
  /// Per-offering scope. Newly created rows always have this set; legacy
  /// pre-migration rows may still be `null` — fall back to `courseId` matching.
  courseOfferingId: number | null;
  /// Optional grouping inside a teacher-defined module (Week 1, Module 2, …).
  /// `null` means the resource sits in the "Ungrouped" bucket.
  moduleId: number | null;
  /// Drag-reorder index within the resource's module bucket.
  position: number;
  teacherId: number;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  teacher?: {
    id: number;
    full_name: string;
  };
}

export interface UploadResourceFileResult {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface CreateResourceData {
  title: string;
  description?: string;
  type?: ResourceType;
  url: string;
  originalName?: string | null;
  mimeType?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacherId: number;
  is_draft?: boolean;
  /// When set, the new resource lands inside this module bucket. Omit /
  /// pass `null` for the "Ungrouped" bucket.
  moduleId?: number | null;
}

export interface UpdateResourceData {
  title?: string;
  description?: string;
  type?: ResourceType;
  url?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_draft?: boolean;
  moduleId?: number | null;
  position?: number;
}

export interface ResourceFilters {
  search?: string;
  type?: 'all' | ResourceType;
  status?: 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

// ─── Watch tracking (video / audio analytics) ───────────────────────────────

/// Heartbeat payload the player POSTs as a student watches. `watchedDelta` is
/// the seconds of real playback since the previous beat (the server clamps it).
export interface ResourceProgressInput {
  watchedDelta: number;
  position: number;
  duration: number;
  /// True on a fresh play from the start — increments the server view count.
  started?: boolean;
  /// True when the media fired its `ended` event — the student played through
  /// to the end, so the server marks the view completed regardless of whether
  /// accumulated watch time crossed the 90% threshold (buffering / tab
  /// throttling can otherwise leave a genuine full-watcher just under it).
  ended?: boolean;
}

/// The calling student's own progress, used to resume playback.
export interface MyResourceProgress {
  watchedSeconds: number;
  durationSeconds: number;
  lastPositionSeconds: number;
  completed: boolean;
}

/// One row of teacher analytics — a single enrolled student's watch state.
/// Non-watchers are included with zeroes so the teacher sees who hasn't started.
export interface ResourceAnalyticsRow {
  studentId: number;
  fullName: string;
  number: string;
  watchedSeconds: number;
  durationSeconds: number;
  /// 0–100, derived from watchedSeconds / durationSeconds.
  percent: number;
  completed: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  started: boolean;
}

export interface ResourceAnalytics {
  summary: {
    totalStudents: number;
    viewers: number;
    completedCount: number;
    avgPercent: number;
  };
  rows: ResourceAnalyticsRow[];
}

// ─── Modules ────────────────────────────────────────────────────────────────

export interface CourseModule {
  id: number;
  courseOfferingId: number;
  title: string;
  description: string | null;
  position: number;
  /// `null` while unpublished (only visible to teachers); ISO timestamp once
  /// the teacher publishes the module to students.
  publishedAt: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateModuleData {
  title: string;
  description?: string | null;
  publishedAt?: string | null;
}

export interface UpdateModuleData {
  title?: string;
  description?: string | null;
  publishedAt?: string | null;
  position?: number;
}

/// Payload for `POST /resources/reorder` and `POST /resources/modules/reorder`.
/// One transaction per call — the server wraps the whole list in a Prisma
/// `$transaction` so the UI never sees a half-shuffled state.
export interface ReorderItem {
  id: number;
  /// Only meaningful for resource reorder; modules ignore this field.
  moduleId?: number | null;
  position: number;
}
