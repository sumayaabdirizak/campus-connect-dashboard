import { apiClient } from '@/lib/api-client';
import { Announcement, CreateAnnouncementDTO } from './types';

let diagnosticForceApiFailure = false;

/** Used by announcement page diagnostics (`__ANNOUNCEMENT_DIAG__`). */
export function setAnnouncementDiagnosticForceApiFailure(value: boolean) {
  diagnosticForceApiFailure = value;
}

export const getAnnouncements = async (opts?: {
  scheduled?: boolean;
  drafts?: boolean;
  /** Matches feed URL `?role=`; server filters `targetRoles` (not sent when `ALL`). */
  audienceRole?: string;
}) => {
  if (diagnosticForceApiFailure) {
    throw new Error('Simulated announcements API failure (diagnostics)');
  }
  /** Server-side lists: scheduled = future SCHEDULED; drafts = caller's DRAFT rows (publishers only). */
  const params = new URLSearchParams();
  if (opts?.scheduled) params.set('status', 'SCHEDULED');
  else if (opts?.drafts) params.set('status', 'DRAFT');
  const ar = opts?.audienceRole?.trim().toUpperCase();
  if (ar && ar !== 'ALL') params.set('role', ar);
  const qs = params.toString();
  const response = await apiClient<
    Announcement[] | { data?: Announcement[]; results?: Announcement[] }
  >(`/announcements${qs ? `?${qs}` : ''}`);
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  return Array.isArray(response?.data) ? response.data : [];
};

/** Lightweight draft count for manager badge (`total` from paginated list, `pageSize=1`). */
export const getAnnouncementDraftsCount = async () => {
  const response = await apiClient<{ total?: number }>('/announcements?status=DRAFT&pageSize=1');
  const total = typeof response?.total === 'number' ? response.total : 0;
  return { count: total };
};

export type AnnouncementMeVisibilityResponse = {
  visibilityUser: {
    id: number;
    role: string;
    facultyIds?: number[];
    departmentIds?: number[];
    batchIds?: number[];
    sectionIds?: number[];
  };
  deanPrimaryFacultyId: number | null;
};

export const getAnnouncementMeVisibility = async () => {
  return apiClient<AnnouncementMeVisibilityResponse>('/announcements/me-visibility');
};

export const getAnnouncementUnreadCount = async () => {
  return apiClient<{ unreadCount: number }>('/announcements/unread-count');
};

/** Full announcement for detail / resume-draft (includes targets, attachments when present). */
export const getAnnouncementById = async (id: number) => {
  return apiClient<Announcement>(`/announcements/${id}`);
};

export const createAnnouncement = async (data: CreateAnnouncementDTO | FormData) => {
  if (data instanceof FormData) {
    return apiClient<Announcement>('/announcements', { method: 'POST', body: data }, true);
  }
  return apiClient<Announcement>(
    '/announcements',
    {
      method: 'POST',
      body: JSON.stringify(data)
    },
    false
  );
};

export const deleteAnnouncement = async (id: number) => {
  return apiClient<{ success: boolean; id?: number }>(`/announcements/${id}`, {
    method: 'DELETE'
  });
};

export const updateAnnouncement = async (id: number, data: Partial<CreateAnnouncementDTO>) => {
  return apiClient<Announcement>(`/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

export const togglePinAnnouncement = async (id: number) => {
  return apiClient<Announcement>(`/announcements/${id}/pin`, {
    method: 'PATCH'
  });
};

export const markAnnouncementAsRead = async (id: number) => {
  return apiClient<{ success: boolean }>(`/announcements/${id}/read`, {
    method: 'POST'
  });
};

/** Toggle heart reaction on an announcement (idempotent per user). */
export const toggleAnnouncementLike = async (id: number) => {
  return apiClient<{ likes: number; likedByCurrentUser: boolean }>(`/announcements/${id}/like`, {
    method: 'POST'
  });
};

export const markAnnouncementsReadBulk = async (ids: number[]) => {
  return apiClient<{ success: boolean; marked: number[] }>(`/announcements/read-bulk`, {
    method: 'POST',
    body: JSON.stringify({ ids })
  });
};

export type AudiencePreviewParams = {
  targetType: 'ALL' | 'FACULTY' | 'DEPARTMENT' | 'BATCH' | 'SECTION';
  facultyId?: number;
  departmentId?: number;
  batchId?: number;
  sectionId?: number;
  /** Multi-target: union over these IDs at the matching scope. */
  departmentIds?: number[];
  batchIds?: number[];
  sectionIds?: number[];
  targetRoles?: string[];
};

export type AudiencePreviewResponse = {
  count: number;
  sample: { id: number; name: string }[];
  targetType: string;
  targetRoles: string[];
  shardCount?: number;
};

/** Resolves how many users will receive an announcement given the current targeting. */
export const previewAnnouncementRecipients = async (params: AudiencePreviewParams) => {
  const search = new URLSearchParams();
  search.set('targetType', params.targetType);
  if (params.facultyId) search.set('facultyId', String(params.facultyId));
  if (params.departmentId) search.set('departmentId', String(params.departmentId));
  if (params.batchId) search.set('batchId', String(params.batchId));
  if (params.sectionId) search.set('sectionId', String(params.sectionId));
  if (params.departmentIds?.length)
    search.set('departmentIds', params.departmentIds.join(','));
  if (params.batchIds?.length) search.set('batchIds', params.batchIds.join(','));
  if (params.sectionIds?.length) search.set('sectionIds', params.sectionIds.join(','));
  if (params.targetRoles?.length) search.set('targetRoles', params.targetRoles.join(','));
  return apiClient<AudiencePreviewResponse>(
    `/announcements/preview-recipients?${search.toString()}`
  );
};
