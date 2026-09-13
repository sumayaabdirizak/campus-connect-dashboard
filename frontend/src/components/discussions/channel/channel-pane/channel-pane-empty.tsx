'use client'

import { MessageSquare } from 'lucide-react'

export function ChannelPaneEmpty() {
  return (
    <div className='flex h-full flex-1 flex-col items-center justify-center gap-5 px-8 text-center'>
      <div className='relative'>
        <div className='flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.75rem] bg-card shadow-md ring-1 ring-border/60'>
          <MessageSquare className='h-9 w-9 text-primary/50' strokeWidth={1.5} />
        </div>
        <span
          aria-hidden
          className='absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-secondary/35 blur-[1px]'
        />
        <span
          aria-hidden
          className='absolute -bottom-1 -left-2 h-3 w-3 rounded-full bg-primary/30'
        />
      </div>

      <div className='max-w-[280px]'>
        <p className='font-display text-base font-semibold tracking-tight text-foreground'>
          No conversation selected
        </p>
        <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
          Choose a channel or club chat from the list to start messaging. Your unread threads
          stay pinned with a badge until you catch up.
        </p>
      </div>
    </div>
  )
}
