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
  isOfficeMessagesOnlyRole,
  type InboxFilter
} from './inbox-helpers';
import { InboxRowItem } from './inbox-row-item';
import { InboxListHeader } from './inbox-list-header';
import { InboxListEmpty } from './inbox-list-empty';
import { InboxSectionHeader } from './inbox-section-header';
import { MessagesContactOffice } from './messages-contact-office';
import { buildInboxListEntries } from '@/lib/inbox/services/build-inbox-list-entries';

function isClubOrGroupRow(row: InboxRow): boolean {
  return isClubInboxRow(row) || row.type === 'group';
}

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
  const officeOnly = isOfficeMessagesOnlyRole(user?.role);
  const canAuthor = canAuthorInboxBroadcast(user?.role);
  const canUseDm = canDirectMessage(user?.role);
  const canUseGroupDm = canCreateGroupDm(user?.role);
  const showDiscover = !officeOnly;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>(
    officeOnly && (defaultFilter === 'group' || defaultFilter === 'club')
      ? 'all'
      : defaultFilter
  );
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [groupMsgOpen, setGroupMsgOpen] = useState(false);
  const [contactOfficeOpen, setContactOfficeOpen] = useState(false);

  const { data, isLoading } = useInbox();
  const rows = data?.rows ?? [];
  const visibleRows = useMemo(
    () => (officeOnly ? rows.filter((r) => !isClubOrGroupRow(r)) : rows),
    [rows, officeOnly]
  );

  const counts = useMemo(
    () => ({
      all: visibleRows.length,
      unread: visibleRows.filter((r) => r.unreadCount > 0).length,
      group: visibleRows.filter((r) => r.type === 'group' && !isClubInboxRow(r)).length,
      club: visibleRows.filter((r) => isClubInboxRow(r)).length,
      dm: visibleRows.filter((r) => r.type === 'dm').length,
      office: visibleRows.filter((r) => r.type === 'office').length
    }),
    [visibleRows]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return visibleRows.filter((r) => {
      if (
        needle &&
        !r.title.toLowerCase().includes(needle) &&
        !r.preview.toLowerCase().includes(needle) &&
        !(r.subtitle ?? '').toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (filter === 'unread') return r.unreadCount > 0;
      if (filter === 'club') return isClubInboxRow(r);
      if (filter === 'group') return r.type === 'group' && !isClubInboxRow(r);
      if (filter === 'dm' || filter === 'office') return r.type === filter;
      return true;
    });
  }, [visibleRows, search, filter]);

  const listEntries = useMemo(
    () => buildInboxListEntries(filtered, { groupOfficeDesks: officeOnly }),
    [filtered, officeOnly]
  );

  const FILTERS: { id: InboxFilter; label: string; count: number }[] = officeOnly
    ? [
        { id: 'all', label: 'All', count: counts.all },
        { id: 'unread', label: 'Unread', count: counts.unread },
        { id: 'dm', label: 'DMs', count: counts.dm },
        { id: 'office', label: 'Offices', count: counts.office }
      ]
    : [
        { id: 'all', label: 'All', count: counts.all },
        { id: 'unread', label: 'Unread', count: counts.unread },
        { id: 'group', label: 'Groups', count: counts.group },
        { id: 'club', label: 'Clubs', count: counts.club },
        { id: 'dm', label: 'DMs', count: counts.dm },
        { id: 'office', label: 'Offices', count: counts.office }
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
        onContactOffice={() => setContactOfficeOpen(true)}
        onDiscover={showDiscover ? onDiscover : undefined}
        discoverActive={showDiscover && discoverActive}
        showDiscover={showDiscover}
      />

      <div className='min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain bg-white'>
        {isLoading && rows.length === 0 ? (
          <div className='space-y-0'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className='h-[72px] animate-pulse border-b border-[#F2F4F7] bg-[#F2F4F7]/50'
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <InboxListEmpty
            filter={filter}
            hasSearch={Boolean(search.trim())}
            onDiscover={showDiscover ? onDiscover : undefined}
            showDiscover={showDiscover}
          />
        ) : (
          listEntries.map((entry) =>
            entry.kind === 'header' ? (
              <InboxSectionHeader key={entry.key} label={entry.label} />
            ) : (
              <InboxRowItem
                key={entry.key}
                row={entry.row}
                isActive={entry.row.href === activeHref}
                onOpen={(opened) => {
                  if (onSelect) onSelect(opened.href, opened);
                  else router.push(opened.href);
                }}
              />
            )
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
      <MessagesContactOffice
        open={contactOfficeOpen}
        onOpenChange={setContactOfficeOpen}
        onOpened={onConversationOpened}
      />
    </div>
  );
}
