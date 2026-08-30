'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar'
import { cn } from '@/lib/utils'
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url'
import { PresenceDot } from '@/components/discussions/details/presence-dot'
import type { ChannelMember, PresenceState } from '@/lib/discussions/queries'
import {
  formatJoinedAt,
  initialsFor,
  ROLE_LABEL,
  ROLE_PILL,
} from './member-format'
import { MemberRemoveButton } from './member-remove-button'

interface MemberRowProps {
  member: ChannelMember
  presence: PresenceState | undefined
  showActions: boolean
  onRemove: (member: ChannelMember) => void
}

export function MemberRow({
  member,
  presence,
  showActions,
  onRemove,
}: MemberRowProps) {
  const name = member.user?.full_name ?? `Member ${member.userId}`
  const joined = formatJoinedAt(member.joinedAt)

  return (
    <div className='group/member flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted'>
      <div className='relative shrink-0'>
        <Avatar className='size-9'>
          {member.user?.avatarUrl ? (
            <AvatarImage src={resolvePublicAssetUrl(member.user.avatarUrl) ?? undefined} alt={name} />
          ) : null}
          <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
            {initialsFor(name)}
          </AvatarFallback>
        </Avatar>
        {presence ? <PresenceDot state={presence} /> : null}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='truncate text-sm font-semibold text-foreground'>
            {name}
          </span>
          <span
            className={cn(
              'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
              ROLE_PILL[member.role]
            )}
          >
            {ROLE_LABEL[member.role]}
          </span>
        </div>
        {joined ? (
          <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
            Joined {joined}
          </p>
        ) : null}
      </div>

      {showActions ? (
        <MemberRemoveButton name={name} onRemove={() => onRemove(member)} />
      ) : null}
    </div>
  )
}
