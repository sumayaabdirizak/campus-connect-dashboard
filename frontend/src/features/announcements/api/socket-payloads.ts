export type AnnouncementRealtimePayload = {
  id: number | string;
  title: string;
  content: string;
  bodyHtml?: string;
  priority: 'normal' | 'important' | 'urgent';
  targetType: 'ALL' | 'FACULTY' | 'DEPARTMENT' | 'BATCH' | 'SECTION';
  status?: string;
  expiresAt?: string | null;
  targeting?: {
    facultyId?: number | null;
    departmentId?: number | null;
    batchId?: number | null;
    sectionId?: number | null;
  };
  imageUrls?: string[];
  createdAt: string;
  isActive?: boolean;
  targetRoles?: string[];
};

export type AnnouncementUpdatedPayload = {
  id: number;
  isPinned: boolean;
  updatedAt: string;
  status?: string;
  expiresAt?: string | null;
};

export type AnnouncementExpiredPayload = {
  id: number;
  status?: string;
};

export type AnnouncementDeadlineReminderPayload = {
  id: number;
  title: string;
  deadlineAt: string | null;
  phase: 'T24H' | 'T1H';
};
