import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icons } from '@/components/icons'
import type { ChannelMember, PresenceState } from '../../api/types'
import { avatarGradient } from '../../utils/avatar-color'
import { PresenceDot } from './presence-dot'
import { initialsFor } from './details-helpers'

type Props = {
  member: ChannelMember
  presence?: PresenceState
  canModerate: boolean
  onRemove?: (userId: number, name: string) => void
}

export function MemberRow({ member, presence, canModerate, onRemove }: Props) {
  const name = member.user?.full_name ?? `Member ${member.userId}`
  const role = member.user?.role
  const isInstructor = role === 'lecturer' || role === 'dean' || role === 'admin'

  return (
    <div className='group/member flex items-center gap-2 px-1 py-1.5'>
      <div className='relative'>
        <Avatar className='h-7 w-7'>
          <AvatarFallback
            className='text-[10px] font-semibold text-white'
            style={{ background: avatarGradient(name) }}
          >
            {initialsFor(name)}
          </AvatarFallback>
        </Avatar>
        {presence ? <PresenceDot state={presence} /> : null}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-xs font-medium'>{name}</div>
        {role ? (
          <div className='truncate text-[10px] capitalize text-muted-foreground'>
            {String(role).replace(/_/g, ' ')}
          </div>
        ) : null}
      </div>
      {isInstructor ? (
        <span className='rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary'>
          {role === 'dean' ? 'Dean' : role === 'admin' ? 'Admin' : 'Instr.'}
        </span>
      ) : null}
      {canModerate && onRemove ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-6 w-6 opacity-0 transition-opacity group-hover/member:opacity-100 focus:opacity-100'
              aria-label={`Moderate ${name}`}
            >
              <Icons.ellipsis className='h-3.5 w-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuItem
              className='gap-2 text-destructive focus:text-destructive'
              onSelect={() => onRemove(Number(member.userId), name)}
            >
              <Icons.trash className='h-3.5 w-3.5' />
              Remove from server
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
