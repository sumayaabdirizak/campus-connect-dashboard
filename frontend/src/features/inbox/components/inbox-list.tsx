'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  User,
  Landmark,
  MessageSquareDashed,
  Plus,
  Pencil,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useInbox } from '../api/inbox-queries';
import { NewMessageDialog } from './new-message-dialog';
import { AUTHOR_ROLES, fmtWhen, type InboxFilter } from './inbox-helpers';
import { InboxRowItem } from './inbox-row-item';

export function InboxList({
  onSelect,
  activeHref,
}: {
  onSelect?: (href: string) => void;
  activeHref?: string;
} = {}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const canAuthor = AUTHOR_ROLES.includes(String(user?.role ?? ''));

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [newMsgOpen, setNewMsgOpen] = useState(false);

  const { data, isLoading } = useInbox();
  const rows = data?.rows ?? [];

  const counts = useMemo(
    () => ({
      all: rows.length,
      unread: rows.filter((r) => r.unreadCount > 0).length,
      group: rows.filter((r) => r.type === 'group').length,
      dm: rows.filter((r) => r.type === 'dm').length,
      office: rows.filter((r) => r.type === 'office').length
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.title.toLowerCase().includes(needle) && !r.preview.toLowerCase().includes(needle))
        return false;
      if (filter === 'unread') return r.unreadCount > 0;
      if (filter === 'group' || filter === 'dm' || filter === 'office') return r.type === filter;
      return true;
    });
  }, [rows, search, filter]);

  const emptyList = filtered.length === 0;

  const FILTERS: { id: InboxFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'group', label: 'Groups', count: counts.group },
    { id: 'dm', label: 'DMs', count: counts.dm },
    { id: 'office', label: 'Offices', count: counts.office }
  ];



  return (
    <div className='mx-auto flex h-full w-full max-w-2xl flex-col px-3 pt-3'>
      <div className='space-y-3 pb-2'>
        <div className='flex items-center gap-2'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search messages'
              className='h-10 rounded-full bg-muted/60 pl-9'
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='icon' className='size-10 shrink-0 rounded-full' aria-label='New conversation'>
                <Plus className='size-5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-52'>
              <DropdownMenuItem onClick={() => setNewMsgOpen(true)}>
                <User className='mr-2 size-4' /> New message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/offices')}>
                <Landmark className='mr-2 size-4' /> Contact an office
              </DropdownMenuItem>
              {canAuthor && (
                <DropdownMenuItem onClick={() => router.push('/dashboard/announcements')}>
                  <Pencil className='mr-2 size-4' /> New broadcast
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='flex flex-wrap gap-1.5'>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type='button'
                onClick={() => setFilter(f.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {f.label}
                {f.count > 0 && f.id !== 'all' && (
                  <span className={cn('tabular-nums', active ? 'opacity-80' : 'opacity-60')}>{f.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className='min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto rounded-2xl border bg-card'>
        {isLoading && rows.length === 0 ? (
          <div className='space-y-2 p-3'>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className='h-14 animate-pulse rounded-xl bg-muted/50' />
            ))}
          </div>
        ) : (
          <>


            {emptyList ? (
              <div className='flex flex-col items-center justify-center gap-2 px-6 py-16 text-center'>
                <MessageSquareDashed className='size-8 text-muted-foreground/50' />
                <p className='text-sm text-muted-foreground'>
                  {search || filter !== 'all' ? 'No conversations match.' : 'No conversations yet.'}
                </p>
              </div>
            ) : (
              filtered.map((row) => (
                <InboxRowItem 
                  key={row.key} 
                  row={row} 
                  isActive={row.href === activeHref}
                  onOpen={(href) => {
                    if (onSelect) onSelect(href);
                    else router.push(href);
                  }} 
                />
              ))
            )}
          </>
        )}
      </div>

      <NewMessageDialog open={newMsgOpen} onOpenChange={setNewMsgOpen} />
    </div>
  );
}
