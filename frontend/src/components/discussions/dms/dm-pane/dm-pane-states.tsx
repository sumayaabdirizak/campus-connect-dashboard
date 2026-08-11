'use client'

import { Pencil, User, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar'
import { Button } from '@/features/ui/components/button'
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/components/dropdown-menu'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'
import {
  ChatIdentityAvatar,
  ChatIdentityText,
} from '@/components/inbox/chat-identity'
import { initialsFor } from './dm-pane-helpers'

export function DmPaneHeader({
  displayName,
  isLoading,
  previewMembers,
  memberCount,
  isOneToOne,
  iconUrl,
  leavePending,
  onLeave,
  onAddMembers,
  onRename,
  onViewMembers,
}: {
  displayName: string
  isLoading: boolean
  previewMembers: Array<{ userId: number; user?: { full_name: string } | null }>
  memberCount: number
  isOneToOne: boolean
  iconUrl?: string | null
  leavePending: boolean
  onLeave: () => void
  onAddMembers?: () => void
  /** Owner-only — omit to hide the "Rename" option (e.g. non-owner, or a 1:1 DM). */
  onRename?: () => void
  onViewMembers?: () => void
}) {
  const subtitle = isOneToOne
    ? undefined
    : memberCount > 0
      ? `${memberCount} members`
      : 'Group message'

  return (
    <header
      className={cn(
        'flex min-h-[72px] min-w-0 shrink-0 items-center justify-between gap-3',
        'border-b border-[rgba(145,158,171,0.3)] bg-white px-4 py-3.5 sm:px-6',
        'shadow-[0px_4px_60px_0px_rgba(231,231,231,0.47)]'
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        {isOneToOne ? (
          <ChatIdentityAvatar
            title={displayName || 'DM'}
            badge={<User className='size-2.5 text-[#667085]' aria-hidden />}
          />
        ) : iconUrl ? (
          <Avatar className='size-11 shrink-0 border-2 border-white shadow-sm sm:size-12'>
            <AvatarImage src={resolvePublicAssetUrl(iconUrl) ?? undefined} alt={displayName} />
            <AvatarFallback className='bg-[#3B82F6] text-[10px] font-semibold text-white'>
              {initialsFor(displayName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className='flex shrink-0 -space-x-2'>
            {previewMembers.slice(0, 3).map((m) => (
              <Avatar
                key={m.userId}
                className='size-11 border-2 border-white shadow-sm sm:size-12'
              >
                <AvatarFallback className='bg-[#3B82F6] text-[10px] font-semibold text-white'>
                  {initialsFor(m.user?.full_name ?? '?')}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Skeleton className='h-4 w-36' />
            <Skeleton className='h-3 w-28 max-w-full' />
          </div>
        ) : (
          <ChatIdentityText
            title={displayName}
            subtitle={subtitle}
            titleClassName='text-[15px] font-semibold leading-none text-[#101828]'
          />
        )}
      </div>

      <div className='flex shrink-0 items-center gap-0.5'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-10 rounded-full text-[#101828] hover:bg-[#F2F4F7]'
              aria-label='Conversation options'
            >
              <Icons.ellipsis className='h-5 w-5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            {onViewMembers ? (
              <DropdownMenuItem onSelect={() => window.setTimeout(onViewMembers, 0)}>
                <Users className='h-4 w-4' />
                View members
              </DropdownMenuItem>
            ) : null}
            {onRename ? (
              <DropdownMenuItem onSelect={() => window.setTimeout(onRename, 0)}>
                <Pencil className='h-4 w-4' />
                Edit conversation
              </DropdownMenuItem>
            ) : null}
            {onAddMembers ? (
              <DropdownMenuItem onSelect={() => window.setTimeout(onAddMembers, 0)}>
                <Icons.userPlus className='h-4 w-4' />
                Add members
              </DropdownMenuItem>
            ) : null}
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
      </div>
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
