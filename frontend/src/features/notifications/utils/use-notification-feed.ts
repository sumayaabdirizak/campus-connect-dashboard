'use client';

import { useCallback, useMemo } from 'react';
import {
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek
} from 'date-fns';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { useAnnouncements } from '@/features/announcements/api/queries';
import {
  useNotifications,
  useMarkNotificationsRead
} from '@/features/discussions/api/queries';
import type { DiscussionNotification } from '@/features/discussions/api/types';
import { useReadKeys, markKeysRead } from './read-store';

/** Source bucket — drives the per-item icon and the page filter tabs. */
export type NotifSource = 'announcement' | 'assignment' | 'quiz' | 'discussion';

export interface NotifItem {
  key: string;
  source: NotifSource;
  /** Sub-type, e.g. a discussion 'MENTION' / 'REACTION'. */
  type: string;
  title: string;
  subtitle: string;
  /** Short description without the timestamp (the timeline shows time separately). */
  body: string;
  at: string;
  href: string;
  read: boolean;
  /** Server id for discussion notifications (drives server-side mark-read). */
  serverId?: number;
}

interface DeadlineRow {
  kind: 'announcement' | 'assignment' | 'quiz';
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

function rel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

const DAY = 24 * 60 * 60 * 1000;

// ── Discussion notification → unified item ────────────────────────────────────
function discTitle(n: DiscussionNotification): string {
  const p = n.payload ?? {};
  const d = n.display;
  switch (n.type) {
    case 'MENTION':
      return `${p.senderName ?? d?.messageSenderName ?? 'Someone'} mentioned you`;
    case 'REACTION':
      return `${p.reactorName ?? 'Someone'} reacted ${p.emoji ?? ''}`.trim();
    case 'PIN':
      return `${p.pinnedByName ?? 'Someone'} pinned a message`;
    case 'MESSAGE':
      return `New message${d?.channelHash ? ` in ${d.channelHash}` : ''}`;
    case 'ADMIN_ANNOUNCEMENT':
      return d?.snippet || 'Announcement';
    case 'CLUB_APPROVED':
      return 'Your club was approved';
    case 'CLUB_REJECTED':
      return 'Your club request was declined';
    case 'CLUB_JOIN_REQUEST':
      return 'New club join request';
    case 'CLUB_JOIN_DECIDED':
      return 'Club membership decision';
    case 'CLUB_INVITE':
      return 'You were invited to a club';
    case 'CLUB_PROMOTED':
      return 'You were promoted in a club';
    case 'CLUB_REMOVED':
      return 'Club membership update';
    default:
      return d?.snippet || 'Discussion update';
  }
}

function discHref(n: DiscussionNotification): string {
  if (String(n.type).startsWith('CLUB')) return '/dashboard/clubs';
  const p = n.payload ?? {};
  const g = p.groupId ?? n.groupId ?? undefined;
  const c = p.channelId;
  if (g && c) return `/dashboard/chat/${g}/${c}`;
  if (g) return `/dashboard/chat/${g}`;
  return '/dashboard/chat';
}

function discSubtitle(n: DiscussionNotification): string {
  const d = n.display;
  const parts: string[] = [];
  if (d?.groupLabel) parts.push(d.groupLabel);
  if (d?.snippet && n.type !== 'ADMIN_ANNOUNCEMENT') parts.push(d.snippet);
  const r = rel(n.createdAt);
  if (r) parts.push(r);
  return parts.join(' · ');
}

// ── Date grouping ─────────────────────────────────────────────────────────────
const GROUP_ORDER = ['Today', 'Tomorrow', 'Upcoming', 'Yesterday', 'This week', 'Earlier'];
const FUTURE_GROUPS = new Set(['Today', 'Tomorrow', 'Upcoming']);

function bucketLabel(at: string): string {
  const d = new Date(at);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  if (d.getTime() > Date.now()) return 'Upcoming';
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'This week';
  return 'Earlier';
}

export function groupNotifications(items: NotifItem[]): { label: string; items: NotifItem[] }[] {
  const map = new Map<string, NotifItem[]>();
  for (const it of items) {
    const label = bucketLabel(it.at);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(it);
  }
  return GROUP_ORDER.filter((l) => map.has(l)).map((label) => {
    const list = map.get(label)!;
    // Future buckets soonest-first; past buckets newest-first.
    list.sort((a, b) =>
      FUTURE_GROUPS.has(label)
        ? new Date(a.at).getTime() - new Date(b.at).getTime()
        : new Date(b.at).getTime() - new Date(a.at).getTime()
    );
    return { label, items: list };
  });
}

/**
 * Aggregated, read-aware notification feed for the bell + page. Combines three
 * real sources — recent announcements, upcoming assignment/quiz deadlines, and
 * server-side discussion notifications (mentions, replies, club alerts) — into
 * one typed list with unified read state.
 */
export function useNotificationFeed() {
  const { data: annData, isLoading: annLoading } = useAnnouncements();
  const { data: discData, isLoading: discLoading } = useNotifications('all', 60);
  const markDisc = useMarkNotificationsRead();
  const readKeys = useReadKeys();

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

  const items = useMemo<NotifItem[]>(() => {
    const isRead = (key: string, serverRead = false) => serverRead || readKeys.has(key);

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
          body: a.createdBy?.name ? `From ${a.createdBy.name}` : 'New announcement',
          at: a.createdAt,
          href: '/dashboard/announcements',
          read: isRead(key)
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
            ? `/dashboard/courses/${d.courseOfferingId}?tab=${d.kind === 'quiz' ? 'quizzes' : 'assignments'}`
            : '/dashboard/calendar',
          read: isRead(key)
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
        serverId: n.id
      };
    });

    return [...announcements, ...deadlines, ...discussion];
  }, [annData, dlData, discData, readKeys]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

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
    },
    [markDisc]
  );

  const markAllRead = useCallback(() => {
    markKeysRead(items.map((i) => i.key));
    if (items.some((i) => i.source === 'discussion' && !i.read)) {
      markDisc.mutate({ markAll: true });
    }
  }, [items, markDisc]);

  return {
    items,
    recent,
    unreadCount,
    markRead,
    markAllRead,
    loading: annLoading || dlLoading || discLoading
  };
}
