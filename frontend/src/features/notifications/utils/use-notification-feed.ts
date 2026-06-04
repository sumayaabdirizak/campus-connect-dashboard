'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { useAnnouncements } from '@/features/announcements/api/queries';

export type NotifType = 'announcement' | 'assignment' | 'quiz';

export interface NotifItem {
  key: string;
  type: NotifType;
  title: string;
  subtitle: string;
  at: string;
  href: string;
  isNew: boolean;
}

interface DeadlineRow {
  kind: NotifType;
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: number | null;
}

function rel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Aggregated notification feed for the bell + notifications page. Combines two
 * real sources: announcements (recent) and upcoming assignment/quiz deadlines
 * (next 30 days). Each becomes a typed NotifItem with a deep link.
 */
export function useNotificationFeed() {
  const { data: annData, isLoading: annLoading } = useAnnouncements();

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    return {
      fromIso: now.toISOString(),
      toIso: new Date(now.getTime() + 30 * DAY).toISOString()
    };
  }, []);
  const { data: dlData, isLoading: dlLoading } = useQuery({
    queryKey: ['notifications', 'deadlines', fromIso],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      )
  });

  const announcements: NotifItem[] = useMemo(
    () =>
      (annData ?? []).map((a: { id: string | number; title: string; createdAt: string; isNew?: boolean; createdBy?: { name?: string } }) => ({
        key: `ann-${a.id}`,
        type: 'announcement' as const,
        title: a.title,
        subtitle: a.createdBy?.name ? `${a.createdBy.name} · ${rel(a.createdAt)}` : rel(a.createdAt) || 'Announcement',
        at: a.createdAt,
        href: '/dashboard/announcements',
        isNew: !!a.isNew
      })),
    [annData]
  );

  const deadlines: NotifItem[] = useMemo(() => {
    const now = Date.now();
    const soon = now + 3 * DAY;
    return (dlData?.results ?? [])
      .filter(
        (d) =>
          (d.kind === 'assignment' || d.kind === 'quiz') &&
          d.deadlineAt &&
          new Date(d.deadlineAt).getTime() >= now
      )
      .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime())
      .map((d) => ({
        key: `${d.kind}-${d.id}`,
        type: d.kind,
        title: d.courseCode ? `${d.courseCode} · ${d.title}` : d.title,
        subtitle: `Due ${rel(d.deadlineAt)}`,
        at: d.deadlineAt!,
        href: d.courseOfferingId
          ? `/dashboard/courses/${d.courseOfferingId}?tab=${d.kind === 'quiz' ? 'quizzes' : 'assignments'}`
          : '/dashboard/calendar',
        isNew: new Date(d.deadlineAt!).getTime() <= soon
      }));
  }, [dlData]);

  // Bell preview: nearest deadlines first, then recent announcements.
  const recent = useMemo(
    () => [...deadlines.slice(0, 4), ...announcements.slice(0, 4)].slice(0, 6),
    [deadlines, announcements]
  );

  const newCount =
    deadlines.filter((d) => d.isNew).length + announcements.filter((a) => a.isNew).length;

  return { announcements, deadlines, recent, newCount, loading: annLoading || dlLoading };
}
