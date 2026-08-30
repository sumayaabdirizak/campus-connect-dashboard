'use client';

import type { RefObject } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PastelSlot } from '@/lib/pastel';
import type { OfficeThreadDetail } from '@/lib/offices/types';
import { formatMessageDateTime } from '@/lib/format-time';

function messageTime(iso: string): string {
  return formatMessageDateTime(iso);
}

export function OfficeThreadMessages({
  thread,
  myId,
  hue,
  endRef,
}: {
  thread: OfficeThreadDetail;
  myId: number | null;
  hue: PastelSlot;
  endRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className='mt-3 flex-1 space-y-3 overflow-y-auto rounded-xl border bg-card p-4'>
      {thread.messages.map((m) => {
        const own = m.sender?.id === myId;
        const fromStudent = m.sender?.id === thread.student.id;
        return (
          <div key={m.id} className={cn('flex flex-col', own ? 'items-end' : 'items-start')}>
            <div className='mb-0.5 flex items-center gap-2 text-[11px] text-muted-foreground'>
              {!own && (
                <span className='font-medium text-foreground'>{m.sender?.full_name ?? 'Staff'}</span>
              )}
              <span>{messageTime(m.createdAt)}</span>
              {m.isInternalNote && (
                <span className='inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'>
                  <Lock className='size-2.5' /> internal
                </span>
              )}
            </div>
            <div
              className={cn(
                'w-fit max-w-[82%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm leading-relaxed',
                m.isInternalNote
                  ? 'border border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-500/10'
                  : own
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : fromStudent
                      ? 'rounded-bl-md bg-muted'
                      : cn('rounded-bl-md', hue.chip)
              )}
            >
              {m.content}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
