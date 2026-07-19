'use client';

import { Badge } from '@/components/ui/badge';
import { Crown, Users } from 'lucide-react';
import type { GroupInfo } from '../../../api/groups-types';

export function GroupInfoPanel({
  groupInfo,
  isLeader,
}: {
  groupInfo: GroupInfo | null;
  isLeader: boolean;
}) {
  if (groupInfo) {
    return (
      <div className='mt-3 border rounded-md bg-muted/20 px-3 py-2'>
        <div className='flex items-center gap-1.5 mb-1.5'>
          <Users className='w-3.5 h-3.5 text-muted-foreground' />
          <p className='text-xs font-medium'>{groupInfo.groupName}</p>
          {isLeader ? (
            <Badge
              variant='outline'
              className='text-[10px] gap-0.5 text-amber-600 border-amber-300'
            >
              <Crown className='w-2.5 h-2.5' /> You are the leader
            </Badge>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground'>
          {groupInfo.members.map((m) => (
            <span key={m.id} className='inline-flex items-center gap-0.5'>
              {m.role === 'LEADER' ? (
                <Crown className='w-2.5 h-2.5 text-amber-500' />
              ) : null}
              {m.name}
            </span>
          ))}
        </div>
        {!isLeader ? (
          <p className='text-[11px] text-muted-foreground mt-1.5'>
            Your group leader will submit on behalf of the group.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className='mt-3 border rounded-md bg-destructive/5 px-3 py-2'>
      <p className='text-xs text-destructive'>
        You are not assigned to any group. Ask your teacher to add you to a group.
      </p>
    </div>
  );
}
