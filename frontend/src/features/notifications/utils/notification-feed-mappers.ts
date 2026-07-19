import {
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek,
} from 'date-fns';
import type { DiscussionNotification } from '@/features/discussions/api/types';
import type { NotifItem } from './notification-feed-types';

export function rel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

export function discTitle(n: DiscussionNotification): string {
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

export function discHref(n: DiscussionNotification): string {
  if (String(n.type).startsWith('CLUB')) return '/dashboard/clubs';
  const p = n.payload ?? {};
  const g = p.groupId ?? n.groupId ?? undefined;
  const c = p.channelId;
  if (g && c) return `/dashboard/chat/${g}/${c}`;
  if (g) return `/dashboard/chat/${g}`;
  return '/dashboard/chat';
}

export function discSubtitle(n: DiscussionNotification): string {
  const d = n.display;
  const parts: string[] = [];
  if (d?.groupLabel) parts.push(d.groupLabel);
  if (d?.snippet && n.type !== 'ADMIN_ANNOUNCEMENT') parts.push(d.snippet);
  const r = rel(n.createdAt);
  if (r) parts.push(r);
  return parts.join(' · ');
}

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
    list.sort((a, b) =>
      FUTURE_GROUPS.has(label)
        ? new Date(a.at).getTime() - new Date(b.at).getTime()
        : new Date(b.at).getTime() - new Date(a.at).getTime()
    );
    return { label, items: list };
  });
}
