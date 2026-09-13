'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { useRecentAnnouncements } from '@/lib/announcements/queries';
import {
  useNotifications,
  useMarkNotificationsRead,
} from '@/lib/discussions/queries';
import { useCalendarDeadlines } from '@/lib/calendar/queries';
import { courseOfferingPath } from '@/lib/course-offering-href';
import {
  fetchCourseActivityNotifications,
  markCourseActivityRead,
} from '../../queries/course-activity';
import { useReadKeys, markKeysRead } from './read-store';
import {
  discHref,
  discSubtitle,
  discTitle,
  groupNotifications,
  rel,
} from './notification-feed-mappers';
import { mapCourseActivityItems } from './map-course-activity';
import type { NotifItem } from '../../types';
import { NOTIFICATION_DAY_MS } from '../../types';

export type { NotifItem, NotifSource } from '../../types';
export { groupNotifications } from './notification-feed-mappers';

export function useNotificationFeed(options?: {
  enabled?: boolean;
  /** Cap announcement rows merged into the feed (default 30 on full page). */
  announcementLimit?: number;
}) {
  const enabled = options?.enabled ?? true;
  const announcementLimit = options?.announcementLimit ?? 30;
  const queryClient = useQueryClient();
  const { data: annData, isLoading: annLoading } = useRecentAnnouncements(
    announcementLimit,
    { enabled }
  );
  const { data: discData, isLoading: discLoading } = useNotifications('all', 40, {
    enabled,
  });
  const markDisc = useMarkNotificationsRead();
  const readKeys = useReadKeys();

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    return {
      fromIso: now.toISOString(),
      toIso: new Date(now.getTime() + 30 * NOTIFICATION_DAY_MS).toISOString(),
    };
  }, []);

  const { data: dlData, isLoading: dlLoading } = useCalendarDeadlines(fromIso, toIso, {
    enabled,
  });

  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ['notifications', 'course-activity'],
    queryFn: () => fetchCourseActivityNotifications(30),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const markCourse = useMutation({
    mutationFn: markCourseActivityRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'course-activity'],
      });
    },
  });

  const items = useMemo<NotifItem[]>(() => {
    if (!enabled) return [];

    const isRead = (key: string, serverRead = false) =>
      serverRead || readKeys.has(key);

    const announcements: NotifItem[] = (annData ?? []).map(
      (a: {
        id: string | number;
        title: string;
        createdAt: string;
        createdBy?: { name?: string };
      }) => {
        const key = `ann-${a.id}`;
        return {
          key,
          source: 'announcement' as const,
          type: 'announcement',
          title: a.title,
          subtitle: a.createdBy?.name
            ? `${a.createdBy.name} · ${rel(a.createdAt)}`
            : rel(a.createdAt) || 'Announcement',
          body: a.createdBy?.name
            ? `From ${a.createdBy.name}`
            : 'New announcement',
          at: a.createdAt,
          href: '/dashboard/announcements',
          read: isRead(key),
        };
      }
    );

    const now = Date.now();
    const deadlines: NotifItem[] = (dlData?.results ?? [])
      .filter(
        (d) =>
          (d.kind === 'assignment' || d.kind === 'quiz') &&
          d.deadlineAt &&
          new Date(d.deadlineAt).getTime() >= now
      )
      .map((d) => {
        const key = `${d.kind}-${d.id}`;
        return {
          key,
          source: d.kind,
          type: d.kind,
          title: d.courseCode ? `${d.courseCode} · ${d.title}` : d.title,
          subtitle: `Due ${rel(d.deadlineAt)}`,
          body: d.kind === 'quiz' ? 'Quiz due' : 'Assignment due',
          at: d.deadlineAt!,
          href: d.courseOfferingId
            ? courseOfferingPath(d.courseOfferingId, {
                tab: d.kind === 'quiz' ? 'quizzes' : 'assignments',
                quiz: d.kind === 'quiz' ? d.id : undefined,
              })
            : '/dashboard/calendar',
          read: isRead(key),
        };
      });

    const discussion: NotifItem[] = (discData?.results ?? []).map((n) => {
      const key = `disc-${n.id}`;
      return {
        key,
        source: 'discussion' as const,
        type: String(n.type),
        title: discTitle(n),
        subtitle: discSubtitle(n),
        body: n.display?.snippet || n.display?.groupLabel || 'Discussion',
        at: n.createdAt,
        href: discHref(n),
        read: isRead(key, !!n.readAt),
        serverId: n.id,
      };
    });

    const course = mapCourseActivityItems(courseData?.results, isRead);
    return [...announcements, ...deadlines, ...discussion, ...course];
  }, [annData, dlData, discData, courseData, readKeys, enabled]);

  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items]
  );

  const recent = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 8),
    [items]
  );

  const markRead = useCallback(
    (item: NotifItem) => {
      if (item.read) return;
      markKeysRead([item.key]);
      if (item.source === 'discussion' && item.serverId != null) {
        markDisc.mutate({ notificationIds: [item.serverId] });
      }
      if (item.key.startsWith('course-') && item.serverId != null) {
        markCourse.mutate({ notificationIds: [item.serverId] });
      }
    },
    [markDisc, markCourse]
  );

  const markAllRead = useCallback(() => {
    markKeysRead(items.map((i) => i.key));
    if (items.some((i) => i.source === 'discussion' && !i.read)) {
      markDisc.mutate({ markAll: true });
    }
    if (items.some((i) => i.key.startsWith('course-') && !i.read)) {
      markCourse.mutate({ markAll: true });
    }
  }, [items, markDisc, markCourse]);

  return {
    items,
    recent,
    unreadCount,
    markRead,
    markAllRead,
    loading: enabled && (annLoading || dlLoading || discLoading || courseLoading),
  };
}
