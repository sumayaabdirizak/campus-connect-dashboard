'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useClubMembers,
  usePromoteMember,
  useDemoteMember,
  useKickMember,
} from '../../api/queries';
import type { Club, ClubMember, ClubRole } from '../../api/types';
import { MemberRow } from './member-row';

const ROLE_ORDER: Record<ClubRole, number> = {
  OWNER: 0,
  MODERATOR: 1,
  MEMBER: 2,
};

export function MembersTab({
  club,
  isOwner,
  isModerator,
}: {
  club: Club;
  isOwner: boolean;
  isModerator: boolean;
}) {
  const { data, isLoading } = useClubMembers(club.id);
  const promoteMutation = usePromoteMember(club.id);
  const demoteMutation = useDemoteMember(club.id);
  const kickMutation = useKickMember(club.id);
  const [kickTarget, setKickTarget] = useState<ClubMember | null>(null);

  const members = [...(data?.members ?? [])].sort(
    (a, b) => (ROLE_ORDER[a.clubRole] ?? 9) - (ROLE_ORDER[b.clubRole] ?? 9)
  );

  const handleKick = () => {
    if (!kickTarget) return;
    kickMutation.mutate(kickTarget.userId, { onSuccess: () => setKickTarget(null) });
  };

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='flex items-center gap-3'>
            <Skeleton className='h-9 w-9 rounded-full' />
            <Skeleton className='h-4 w-40' />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-sm font-medium'>Members</h3>
          <p className='text-xs text-muted-foreground'>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className='space-y-1'>
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            themeColor={club.themeColor || '#6366f1'}
            canManage={isOwner}
            canKick={isOwner || (isModerator && member.clubRole === 'MEMBER')}
            onPromote={() => promoteMutation.mutate(member.userId)}
            onDemote={() => demoteMutation.mutate(member.userId)}
            onKick={() => setKickTarget(member)}
            isPromoting={promoteMutation.isPending}
            isDemoting={demoteMutation.isPending}
          />
        ))}
      </div>

      <AlertDialog open={!!kickTarget} onOpenChange={() => setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{kickTarget?.user.full_name}</strong> from this
              club? They can rejoin if the club is open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKick}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {kickMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
