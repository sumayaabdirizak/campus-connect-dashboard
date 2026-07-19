import {
  Users,
  User,
  Landmark,
} from 'lucide-react';
import type { InboxRowType } from '../api/inbox-types';

export type InboxFilter = 'all' | 'unread' | 'group' | 'dm' | 'office';

export const AUTHOR_ROLES = ['SUPER_ADMIN', 'DEAN', 'TEACHER'];

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function fmtWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const TYPE_META: Record<InboxRowType, { icon: typeof Users }> = {
  group: { icon: Users },
  dm: { icon: User },
  office: { icon: Landmark }
};
