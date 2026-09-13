import { apiClient } from '@/lib/api-client';

export type CourseActivityRow = {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
  courseCode: string | null;
  courseOfferingId: string | null;
};

export function fetchCourseActivityNotifications(limit = 40) {
  return apiClient<{ results: CourseActivityRow[] }>(
    `/course-activity-notifications?limit=${limit}`
  );
}

export function markCourseActivityRead(input: {
  notificationIds?: number[];
  markAll?: boolean;
}) {
  return apiClient<{ ok: boolean }>('/course-activity-notifications/read', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
