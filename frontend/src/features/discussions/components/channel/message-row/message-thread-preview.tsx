'use client';

import { Icons } from '@/components/icons';

export function MessageThreadPreview({
  replyCount,
  lastReplyAt,
  onOpen
}: {
  replyCount: number;
  lastReplyAt: string | null | undefined;
  onOpen: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onOpen}
      className='mt-1.5 flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground'
    >
      <Icons.chat className='h-3 w-3' />
      <span>
        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </span>
      {lastReplyAt ? (
        <span className='text-[10px] opacity-70'>
          Last reply{' '}
          {new Date(lastReplyAt).toLocaleString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      ) : null}
    </button>
  );
}
