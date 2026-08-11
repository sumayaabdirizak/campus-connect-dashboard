'use client';

import { useState } from 'react';
import { ArrowLeft, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pastelFor } from '@/lib/pastel';
import { Button } from '@/features/ui/components/button';
import { SegmentedControl } from '@/features/ui/components/segmented-control';
import { Skeleton } from '@/features/ui/components/skeleton';
import { useOfficeInbox } from '@/lib/offices/queries';
import { StatusChip, timeAgo } from './office-bits';

interface OfficeInboxProps {
  slug: string;
  onBack: () => void;
  onOpenThread: (id: number) => void;
}

type InboxFilter = 'unassigned' | 'mine' | 'open' | 'resolved';

/** Staff shared inbox: queue tabs + thread rows. Any agent of the office can
 *  open a row and reply; Claim (in the thread view) prevents double-handling. */
export function OfficeInbox({ slug, onBack, onOpenThread }: OfficeInboxProps) {
  const [filter, setFilter] = useState<InboxFilter>('unassigned');
  const { data: threads = [], isLoading } = useOfficeInbox(slug, filter);
  const hue = pastelFor(slug);

  return (
    <div className='space-y-4'>
      <div className={cn('flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3', hue.tile)}>
        <Button variant='ghost' size='icon' className='size-8' onClick={onBack} aria-label='Back'>
          <ArrowLeft className={cn('size-4', hue.text)} />
        </Button>
        <Inbox className={cn('size-4', hue.text)} />
        <p className={cn('text-sm font-semibold capitalize', hue.text)}>
          {slug.replace(/-/g, ' ')} — inbox
        </p>
      </div>

      <SegmentedControl
        ariaLabel='Inbox queue'
        value={filter}
        onChange={setFilter}
        options={(
          [
            ['unassigned', 'Unassigned'],
            ['mine', 'Mine'],
            ['open', 'All open'],
            ['resolved', 'Resolved']
          ] as const
        ).map(([value, label]) => ({ value, label }))}
      />

      {isLoading ? (
        <Skeleton className='h-40 rounded-2xl' />
      ) : threads.length === 0 ? (
        <p className='rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground'>
          {filter === 'unassigned'
            ? 'Queue is clear — no unclaimed conversations. 🎉'
            : 'Nothing here right now.'}
        </p>
      ) : (
        <div className='divide-y overflow-hidden rounded-2xl border bg-card'>
          {threads.map((t) => (
            <button
              key={t.id}
              type='button'
              onClick={() => onOpenThread(t.id)}
              className='flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40'
            >
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <p className='truncate text-sm font-medium'>{t.topic}</p>
                  <StatusChip status={t.status} />
                </div>
                <p className='truncate text-xs text-muted-foreground'>
                  {t.student?.full_name} · {t.reference}
                  {t.assignedTo ? ` · ${t.assignedTo.full_name}` : ' · unclaimed'}
                  {t.lastMessage?.content ? ` — ${t.lastMessage.content}` : ''}
                </p>
              </div>
              <span className='shrink-0 text-[11px] tabular-nums text-muted-foreground'>
                {timeAgo(t.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
