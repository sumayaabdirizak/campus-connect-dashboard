'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useInbox } from '@/lib/inbox/queries';
import type { InboxRow } from '@/lib/inbox/types';
import { NewMessageDialog } from './new-message-dialog';
import { DmCreateDialog } from '@/components/discussions/dms/dm-create-dialog';
import {
  canAuthorInboxBroadcast,
  canCreateGroupDm,
  canDirectMessage,
  isClubInboxRow,
  type InboxFilter
} from './inbox-helpers';
import { InboxRowItem } from './inbox-row-item';
import { InboxListHeader } from './inbox-list-header';
import { InboxListEmpty } from './inbox-list-empty';
import { buildInboxListEntries } from '@/lib/inbox/services/build-inbox-list-entries';

export function InboxList({
  onSelect,
  activeHref,
  onConversationOpened,
  onDiscover,
  discoverActive = false,
  defaultFilter = 'all'
}: {
  onSelect?: (href: string, row?: InboxRow) => void;
  activeHref?: string;
  onConversationOpened?: (href: string) => void;
  onDiscover?: () => void;
  discoverActive?: boolean;
  defaultFilter?: InboxFilter;
} = {}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const canAuthor = canAuthorInboxBroadcast(user?.role);
  const canUseDm = canDirectMessage(user?.role);
  const canUseGroupDm = canCreateGroupDm(user?.role);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>(defaultFilter);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [groupMsgOpen, setGroupMsgOpen] = useState(false);

  const { data, isLoading } = useInbox();
  const rows = data?.rows ?? [];

  const counts = useMemo(
    () => ({
      all: rows.length,
      unread: rows.filter((r: InboxRow) => r.unreadCount > 0).length,
      group: rows.filter((r: InboxRow) => r.type === 'group' && !isClubInboxRow(r)).length,
      club: rows.filter((r: InboxRow) => isClubInboxRow(r)).length,
      dm: rows.filter((r: InboxRow) => r.type === 'dm').length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r: InboxRow) => {
      if (
        needle &&
        !r.title.toLowerCase().includes(needle) &&
        !(r.subtitle ?? '').toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (filter === 'unread') return (r.unreadCount ?? 0) > 0;
      if (filter === 'club') return isClubInboxRow(r);
      if (filter === 'group') return r.type === 'group' && !isClubInboxRow(r);
      if (filter === 'dm') return r.type === 'dm';
      return true;
    });
  }, [rows, search, filter]);

  const listEntries = useMemo(() => buildInboxListEntries(filtered), [filtered]);

  const FILTERS: { id: InboxFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'group', label: 'Groups', count: counts.group },
    { id: 'club', label: 'Clubs', count: counts.club },
    { id: 'dm', label: 'DMs', count: counts.dm },
  ];

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <InboxListHeader
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        filters={FILTERS}
        onFilterChange={setFilter}
        canAuthor={canAuthor}
        canUseDm={canUseDm}
        canUseGroupDm={canUseGroupDm}
        onNewMessage={() => setNewMsgOpen(true)}
        onNewGroupMessage={() => setGroupMsgOpen(true)}
        onDiscover={onDiscover}
        discoverActive={discoverActive}
      />

      <div className='min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain bg-card'>
        {isLoading && rows.length === 0 ? (
          <div className='space-y-0'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className='h-[72px] animate-pulse border-b border-border bg-muted/50'
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <InboxListEmpty
            filter={filter}
            hasSearch={Boolean(search.trim())}
            onDiscover={onDiscover}
          />
        ) : (
          listEntries.map((entry) =>
            entry.kind === 'row' ? (
              <InboxRowItem
                key={entry.key}
                row={entry.row}
                isActive={entry.row.href === activeHref}
                onOpen={(opened) => {
                  if (onSelect) onSelect(opened.href, opened);
                  else router.push(opened.href);
                }}
              />
            ) : null
          )
        )}
      </div>

      <NewMessageDialog
        open={canUseDm && newMsgOpen}
        onOpenChange={setNewMsgOpen}
        onOpened={onConversationOpened}
      />
      <DmCreateDialog
        open={canUseGroupDm && groupMsgOpen}
        onOpenChange={setGroupMsgOpen}
        onOpened={onConversationOpened}
      />
    </div>
  );
}
