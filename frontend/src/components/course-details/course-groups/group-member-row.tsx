'use client';

import { Button } from '@/features/ui/components/button';
import { Crown, UserMinus } from 'lucide-react';
import type { GroupMember } from '@/lib/course-details/services/groups-types';

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

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
  const isLeader = member.role === 'LEADER';
  const name = member.member.full_name;

  return (
    <div className='flex items-center justify-between gap-2 rounded-xl border border-border bg-muted px-3 py-2.5'>
      <div className='flex min-w-0 items-center gap-2.5'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary'>
          {initials(name)}
        </div>
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold text-foreground'>
            {name}
            {isLeader ? (
              <span className='ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800'>
                <Crown className='size-3' />
                Leader
              </span>
            ) : null}
          </p>
          {member.member.number ? (
            <p className='truncate text-xs text-muted-foreground'>{member.member.number}</p>
          ) : null}
        </div>
      </div>
      {!isStudent ? (
        <div className='flex shrink-0 items-center gap-1'>
          <Button
            variant='outline'
            size='sm'
            className={`h-8 gap-1 border-border px-2 text-xs font-medium ${
              isLeader ? 'border-amber-300 bg-amber-50 text-amber-800' : ''
            }`}
            onClick={onToggleLeader}
            disabled={togglePending}
            title={isLeader ? 'Remove leader role' : 'Set as leader'}
          >
            <Crown className='size-3.5' />
            {isLeader ? 'Leader' : 'Make leader'}
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1 border-destructive/30 px-2 text-xs font-medium text-destructive hover:bg-destructive/5'
            onClick={onRemove}
            disabled={removePending}
            title='Remove from group'
          >
            <UserMinus className='size-3.5' />
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
