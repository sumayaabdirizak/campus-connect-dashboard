'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { NotificationsBell } from '../../notifications/notifications-panel'
import { initialsFor } from './dm-pane-helpers'

export function DmPaneHeader({
  displayName,
  isLoading,
  previewMembers,
  memberCount,
  leavePending,
  onLeave,
}: {
  displayName: string
  isLoading: boolean
  previewMembers: Array<{ userId: number; user?: { full_name: string } | null }>
  memberCount: number
  leavePending: boolean
  onLeave: () => void
}) {
  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b border-[#0D3B66]/30 bg-[#0D3B66] px-4 shadow-sm text-white'>
      <div className='flex -space-x-2'>
        {previewMembers.map((m) => (
          <Avatar key={m.userId} className='h-8 w-8 border-2 border-[#0D3B66] shadow-sm'>
            <AvatarFallback className='text-[10px] font-semibold bg-[#0066CC] text-white'>
              {initialsFor(m.user?.full_name ?? '?')}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='truncate font-display text-sm font-semibold tracking-tight text-white'>
          {isLoading ? <Skeleton className='h-4 w-40' /> : displayName}
        </div>
        {memberCount > 0 ? (
          <div className='text-[11px] text-white/70'>
            {memberCount} {memberCount === 1 ? 'member' : 'members'} · Direct message
          </div>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full text-white hover:bg-white/10'
            aria-label='Conversation options'
          >
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuItem
            variant='destructive'
            disabled={leavePending}
            onSelect={() => window.setTimeout(onLeave, 0)}
          >
            <Icons.logout className='h-4 w-4' />
            Leave conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NotificationsBell />
    </header>
  )
}

export function DmPaneEmpty() {
  return (
    <div className='flex h-full flex-1 flex-col items-center justify-center gap-5 px-8 text-center'>
      <div className='flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.75rem] bg-card shadow-md ring-1 ring-border/60'>
        <Icons.chat className='h-9 w-9 text-primary/50' />
      </div>
      <div className='max-w-[280px]'>
        <p className='font-display text-base font-semibold tracking-tight text-foreground'>
          No conversation selected
        </p>
        <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
          Pick a direct message from the list to continue the thread.
        </p>
      </div>
    </div>
  )
}

export function DmPaneError({ message }: { message: string }) {
  return (
    <div className='flex h-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center'>
      <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10'>
        <Icons.warning className='h-7 w-7 text-destructive/80' />
      </div>
      <p className='font-display text-sm font-semibold text-foreground'>
        Couldn’t load this conversation
      </p>
      <p className='max-w-md break-words text-xs text-muted-foreground'>{message}</p>
    </div>
  )
}
