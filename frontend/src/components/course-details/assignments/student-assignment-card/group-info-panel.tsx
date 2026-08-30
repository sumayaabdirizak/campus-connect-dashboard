'use client';

import { Badge } from '@/components/ui/badge';
import { Crown, Users } from 'lucide-react';
import type { GroupInfo } from '@/lib/course-details/services/groups-types';

export function GroupInfoPanel({
  groupInfo,
  isLeader,
}: {
  groupInfo: GroupInfo | null;
  isLeader: boolean;
}) {
  if (groupInfo) {
    return (
      <div className='space-y-1'>
        <div className='flex items-center gap-1.5'>
          <Users className='size-4 text-primary' />
          <p className='text-sm text-foreground'>{groupInfo.groupName}</p>
          {isLeader ? (
            <Badge className='gap-0.5 border-transparent bg-warning text-white' size='xs'>
              <Crown className='w-2.5 h-2.5' /> Leader
            </Badge>
          ) : null}
        </div>
        <p className='text-sm text-foreground'>
          {groupInfo.members.map((m) => m.name).join(', ')}
        </p>
        {!isLeader ? (
          <p className='text-sm text-warning'>
            Only the group leader can turn this in
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <p className='text-sm text-destructive'>
      You are not in a group yet. Ask your teacher to add you.
    </p>
  );
}
