'use client';

import { Button } from '@/features/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/features/ui/components/tooltip';
import { Crown, UserMinus } from 'lucide-react';
import type { GroupMember } from '@/lib/course-details/services/groups-types';

export function GroupMemberRow({
  member,
  isStudent,
  onToggleLeader,
  onRemove,
  togglePending,
  removePending
}: {
  member: GroupMember;
  isStudent: boolean;
  onToggleLeader: () => void;
  onRemove: () => void;
  togglePending: boolean;
  removePending: boolean;
}) {
  return (
    <div className='flex items-center justify-between p-2 bg-muted/30 rounded'>
      <div className='flex items-center gap-2 min-w-0'>
        {member.role === 'LEADER' ? (
          <Crown className='w-3.5 h-3.5 text-amber-500 shrink-0' />
        ) : null}
        <div className='min-w-0'>
          <p className='text-sm font-medium truncate'>
            {member.member.full_name}
            {member.role === 'LEADER' ? (
              <span className='text-[10px] text-amber-600 ml-1'>Leader</span>
            ) : null}
          </p>
          <p className='text-xs text-muted-foreground'>{member.member.number}</p>
        </div>
      </div>
      {!isStudent ? (
        <div className='flex items-center gap-0.5'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className={`h-6 w-6 ${member.role === 'LEADER' ? 'text-amber-500' : ''}`}
                onClick={onToggleLeader}
                disabled={togglePending}
              >
                <Crown className='w-3 h-3' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {member.role === 'LEADER' ? 'Remove leader role' : 'Set as leader'}
            </TooltipContent>
          </Tooltip>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={onRemove}
            disabled={removePending}
          >
            <UserMinus className='w-3 h-3' />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
