'use client'

import { Icons } from '@/components/icons'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'

export function DmMessageListLoading() {
  return (
    <div className='space-y-4 px-6 py-6'>
      {[0, 1, 2].map((i) => (
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

export function DmMessageListError({ message }: { message: string }) {
  return (
    <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground'>
      <Icons.warning className='h-10 w-10 text-destructive/70' />
      <p className='text-sm font-medium text-foreground'>Couldn’t load messages</p>
      <p className='max-w-md break-words text-xs'>{message}</p>
    </div>
  )
}

export function DmMessageListEmpty() {
  return (
    <div
      className={cn(
        'flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground'
      )}
    >
      <Icons.teams className='h-10 w-10 opacity-60' />
      <p className='text-sm font-medium'>No messages yet</p>
      <p className='text-xs'>Send the first message to get the conversation started.</p>
    </div>
  )
}

export function DmMessageListBeginning() {
  return (
    <div className='m-auto max-w-md px-6 py-6 text-center text-muted-foreground'>
      <Icons.teams className='mx-auto h-8 w-8 opacity-60' />
      <p className='mt-2 text-sm font-medium'>This is the start of your conversation</p>
    </div>
  )
}
