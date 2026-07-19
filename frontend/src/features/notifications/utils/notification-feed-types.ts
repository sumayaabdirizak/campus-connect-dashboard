/** Source bucket — drives the per-item icon and the page filter tabs. */
export type NotifSource = 'announcement' | 'assignment' | 'quiz' | 'discussion';

export interface NotifItem {
  key: string;
  source: NotifSource;
  type: string;
  title: string;
  subtitle: string;
  body: string;
  at: string;
  href: string;
  read: boolean;
  serverId?: number;
}

export interface DeadlineRow {
  kind: 'announcement' | 'assignment' | 'quiz';
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

export const NOTIFICATION_DAY_MS = 24 * 60 * 60 * 1000;
