'use client';

import {
  Users,
  UsersRound,
  User,
} from 'lucide-react';
import {
  canAuthorInboxBroadcast,
  canCreateGroupDm,
  canDirectMessage,
  canStudentGroupDm,
  isOfficeMessagesOnlyRole,
} from '@shared/roles';
import type { InboxRow, InboxRowType } from '@/lib/inbox/types';

export type InboxFilter = 'all' | 'unread' | 'group' | 'club' | 'dm';

export {
  canAuthorInboxBroadcast,
  canCreateGroupDm,
  canDirectMessage,
  canStudentGroupDm,
  isOfficeMessagesOnlyRole,
};

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
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const TYPE_META: Record<InboxRowType, { icon: typeof Users }> = {
  group: { icon: Users },
  club: { icon: UsersRound },
  dm: { icon: User },
};

/** Faculty/batch groups that open the Messages channel pane (not clubs). */
export function isServerInboxRow(type: InboxRowType): boolean {
  return type === 'group';
}

/** Club rows (new `type: club` or legacy group + subtitle Club). */
export function isClubInboxRow(row: Pick<InboxRow, 'type' | 'subtitle'>): boolean {
  return row.type === 'club' || row.subtitle === 'Club';
}
