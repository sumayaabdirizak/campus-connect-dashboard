'use client'

import { Icons } from '@/components/icons'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'

export function MessageListLoading() {
  return (
    <div className='space-y-4 px-6 py-6'>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className='flex gap-3'>
          <Skeleton className='h-9 w-9 shrink-0 rounded-full' />
          <div className='flex-1 space-y-1.5'>
            <Skeleton className='h-3 w-24' />
            <Skeleton className='h-4 w-3/4' />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageListError({
  channelId,
  message,
}: {
  channelId: string
  message: string
}) {
  return (
    <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground'>
      <Icons.warning className='h-10 w-10 text-destructive/70' />
      <p className='text-sm font-medium text-foreground'>Couldn’t load messages</p>
      <p className='max-w-md break-words text-xs text-muted-foreground'>
        {message || 'The server returned an error.'}
      </p>
      <p className='text-[11px] text-muted-foreground'>
        Open DevTools (F12) → Network tab → look for the failed{' '}
        <code className='rounded bg-muted px-1 font-mono'>
          /api/discussions/channels/{channelId}/messages
        </code>{' '}
        request to see the status code.
      </p>
    </div>
  )
}

export function MessageListEmpty({ channelName }: { channelName?: string }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[200px] flex-col items-center justify-center gap-4 px-6 text-center'
      )}
    >
      <span className='flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] bg-card text-primary shadow-md ring-1 ring-border/60'>
        <Icons.hash className='h-8 w-8 opacity-70' />
      </span>
      <div className='max-w-[260px]'>
        <p className='font-display text-sm font-semibold tracking-tight text-foreground'>
          No messages yet
        </p>
        <p className='mt-1.5 text-xs leading-relaxed text-muted-foreground'>
          Be the first to say hi{channelName ? ` in #${channelName}` : ''}.
        </p>
      </div>
    </div>
  )
}

export function MessageListBeginning({ channelName }: { channelName?: string }) {
  return (
    <div className='mx-auto max-w-md px-6 py-8 text-center'>
      <span className='mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground'>
        <Icons.hash className='h-5 w-5' />
      </span>
      <p className='mt-3 font-display text-sm font-medium tracking-tight text-foreground'>
        Beginning of {channelName ? `#${channelName}` : 'this channel'}
      </p>
      <p className='mt-1 text-xs text-muted-foreground'>Messages you send will appear below.</p>
    </div>
  )
}
