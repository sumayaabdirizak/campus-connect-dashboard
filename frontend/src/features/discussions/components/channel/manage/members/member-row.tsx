'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { PresenceDot } from '../../../details/presence-dot';
import type { ChannelMember, PresenceState } from '../../../../api/types';
import {
  formatJoinedAt,
  initialsFor,
  MUTE_PRESETS,
  ROLE_BADGE_VARIANT,
  ROLE_LABEL
} from './member-format';

interface MemberRowProps {
  member: ChannelMember;
  presence: PresenceState | undefined;
  showActions: boolean;
  canMute: boolean;
  canKick: boolean;
  onMutePreset: (member: ChannelMember, minutes: number) => void;
  onMuteCustom: (member: ChannelMember) => void;
  onLiftMute: (member: ChannelMember) => void;
  onKick: (member: ChannelMember) => void;
}

export function MemberRow({
  member,
  presence,
  showActions,
  canMute,
  canKick,
  onMutePreset,
  onMuteCustom,
  onLiftMute,
  onKick
}: MemberRowProps) {
  const name = member.user?.full_name ?? `Member ${member.userId}`;
  const globalRole = member.user?.role;

  return (
    <div className='group/member flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60'>
      <div className='relative shrink-0'>
        <Avatar className='h-8 w-8'>
          <AvatarFallback className='text-[11px]'>{initialsFor(name)}</AvatarFallback>
        </Avatar>
        {presence ? <PresenceDot state={presence} /> : null}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='truncate text-sm font-medium'>{name}</span>
          <Badge
            variant={ROLE_BADGE_VARIANT[member.role]}
            className='h-4 px-1.5 text-[10px]'
          >
            {ROLE_LABEL[member.role]}
          </Badge>
        </div>
        <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
          {globalRole ? (
            <span className='capitalize'>{String(globalRole).replace(/_/g, ' ')}</span>
          ) : null}
          {globalRole ? <span aria-hidden>·</span> : null}
          <span>Joined {formatJoinedAt(member.joinedAt)}</span>
        </div>
      </div>
      {showActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-7 w-7 opacity-0 transition-opacity focus:opacity-100 group-hover/member:opacity-100 data-[state=open]:opacity-100'
              aria-label={`Manage ${name}`}
            >
              <Icons.ellipsis className='h-3.5 w-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            {canMute ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className='gap-2'>
                  <Icons.bellOff className='h-3.5 w-3.5' />
                  Mute
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {MUTE_PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.minutes}
                      onSelect={() => onMutePreset(member, preset.minutes)}
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onMuteCustom(member)}>
                    Custom…
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onLiftMute(member)}>
                    Lift mute
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            {canMute && canKick ? <DropdownMenuSeparator /> : null}
            {canKick ? (
              <DropdownMenuItem
                className='gap-2 text-destructive focus:text-destructive'
                onSelect={() => onKick(member)}
              >
                <Icons.trash className='h-3.5 w-3.5' />
                Remove from server
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
