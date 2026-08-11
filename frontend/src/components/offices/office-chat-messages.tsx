'use client';

import type { RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { OfficeMessage } from '@/lib/offices/types';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function OfficeChatMessages({
  messages,
  myId,
  peerLabel,
  endRef,
}: {
  messages: OfficeMessage[];
  myId: number | null;
  peerLabel: string;
  endRef: RefObject<HTMLDivElement | null>;
}) {
  if (messages.length === 0) {
    return (
      <p className='text-muted-foreground py-10 text-center text-sm'>No messages yet — say hello.</p>
    );
  }

  return (
    <>
      {messages.map((m) => {
        const own = m.sender?.id === myId;
        return (
          <div key={m.id} className={cn('flex flex-col', own ? 'items-end' : 'items-start')}>
            {!own ? (
              <span className='mb-0.5 text-[11px] font-medium text-[#475467]'>
                {m.sender?.full_name ?? peerLabel}
              </span>
            ) : null}
            <div
              className={cn(
                'max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed',
                own
                  ? 'rounded-br-md bg-[#3B82F6] text-white'
                  : 'rounded-bl-md bg-white text-[#101828] shadow-sm ring-1 ring-[#E5E7EB]'
              )}
            >
              {m.content}
            </div>
            <span className='text-muted-foreground mt-0.5 text-[10px]'>{fmtTime(m.createdAt)}</span>
          </div>
        );
      })}
      <div ref={endRef} />
    </>
  );
}
