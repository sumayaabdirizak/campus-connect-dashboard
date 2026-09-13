'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Plus, Search, User, Users } from 'lucide-react';
import { Input } from '@/features/ui/components/input';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { messagesDiscoverHref } from '@/lib/inbox/services/messages-href';
import { InboxFilterChips } from './inbox-filter-chips';
import type { InboxFilter } from './inbox-helpers';
import { cn } from '@/lib/utils';

export function InboxListHeader({
  search,
  onSearchChange,
  filter,
  filters,
  onFilterChange,
  canAuthor,
  canUseDm,
  canUseGroupDm,
  onNewMessage,
  onNewGroupMessage,
  onDiscover,
  discoverActive = false,
  showDiscover = true,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filter: InboxFilter;
  filters: { id: InboxFilter; label: string; count: number }[];
  onFilterChange: (f: InboxFilter) => void;
  canAuthor: boolean;
  canUseDm: boolean;
  canUseGroupDm: boolean;
  onNewMessage: () => void;
  onNewGroupMessage: () => void;
  onDiscover?: () => void;
  discoverActive?: boolean;
  showDiscover?: boolean;
}) {
  const router = useRouter();

  return (
    <div className='shrink-0 space-y-3 border-b border-border bg-card px-4 pb-3 pt-4'>
      <div className='flex items-center justify-between gap-2'>
        <h4 className='text-[17px] font-bold tracking-tight text-foreground'>Chats</h4>
        <div className='flex items-center gap-2'>
          {showDiscover ? (
            <button
              type='button'
              className={cn(
                'text-sm font-medium text-primary transition-colors hover:text-[#2563EB]',
                discoverActive && 'underline underline-offset-2'
              )}
              onClick={() => {
                if (onDiscover) onDiscover()
                else router.push(messagesDiscoverHref())
              }}
            >
              Discover
            </button>
          ) : null}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size='icon'
              className='size-9 shrink-0 rounded-full bg-primary text-white hover:bg-[#2563EB]'
              aria-label='New conversation'
            >
              <Plus className='size-5' strokeWidth={2.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52'>
            {canUseDm ? (
              <DropdownMenuItem onClick={onNewMessage}>
                <User className='mr-2 size-4' /> New message
              </DropdownMenuItem>
            ) : null}
            {canUseGroupDm ? (
              <DropdownMenuItem onClick={onNewGroupMessage}>
                <Users className='mr-2 size-4' /> New group message
              </DropdownMenuItem>
            ) : null}
            {canAuthor ? (
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/announcements')}
              >
                <Pencil className='mr-2 size-4' /> New broadcast
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <div className='relative'>
        <Search className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder='Search For Contacts or Messages'
          className='h-10 rounded-full border-0 bg-muted pl-10 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#3B82F6]/25'
        />
      </div>

      <InboxFilterChips
        filter={filter}
        filters={filters}
        onChange={onFilterChange}
      />
    </div>
  );
}
