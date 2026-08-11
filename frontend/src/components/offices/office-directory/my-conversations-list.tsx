'use client';

import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pastelFor } from '@/lib/pastel';
import { Skeleton } from '@/features/ui/components/skeleton';
import { StatusChip, timeAgo } from '@/components/offices/office-bits';
import type { OfficeThreadSummary } from '@/lib/offices/types';

export function MyConversationsList({
  threads,
  loading,
  onOpenThread,
}: {
  threads: OfficeThreadSummary[];
  loading: boolean;
  onOpenThread: (id: number) => void;
}) {
  if (loading) return <Skeleton className='h-24 rounded-2xl' />;

  if (threads.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        Nothing yet — message an office above and the conversation appears here.
      </p>
    );
  }

  return (
    <div className='divide-y overflow-hidden rounded-2xl border bg-card'>
      {threads.map((t) => (
        <button
          key={t.id}
          type='button'
          onClick={() => onOpenThread(t.id)}
          className='flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40'
        >
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl',
              pastelFor(t.office?.slug ?? '').chip
            )}
          >
            <Building2 className='size-4' />
          </span>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <p className='truncate text-sm font-medium'>{t.topic}</p>
              <StatusChip status={t.status} />
            </div>
            <p className='truncate text-xs text-muted-foreground'>
              {t.office?.name} · {t.reference}
              {t.lastMessage?.content ? ` — ${t.lastMessage.content}` : ''}
            </p>
          </div>
          <span className='shrink-0 text-[11px] tabular-nums text-muted-foreground'>
            {timeAgo(t.updatedAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
