'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClubRoleBadge } from '@/components/clubs/club-role-badge';
import type { ClubMember } from '@/lib/clubs/types';

export function MemberRow({
  member,
  themeColor,
  canManage,
  canKick,
  onPromote,
  onDemote,
  onKick,
  isPromoting,
  isDemoting,
}: {
  member: ClubMember;
  themeColor: string;
  canManage: boolean;
  canKick: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onKick: () => void;
  isPromoting: boolean;
  isDemoting: boolean;
}) {
  const showMenu =
    (canManage && member.clubRole !== 'OWNER') || (canKick && member.clubRole === 'MEMBER');

  return (
    <div className='flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50'>
      <div
        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold'
        style={{
          backgroundColor: member.clubRole === 'OWNER' ? `${themeColor}20` : 'var(--muted)',
          color: member.clubRole === 'OWNER' ? themeColor : 'var(--muted-foreground)',
        }}
      >
        {member.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.user.avatarUrl} alt='' className='h-full w-full rounded-full object-cover' />
        ) : (
          member.user.full_name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('')
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <p className='truncate text-sm font-medium'>{member.user.full_name}</p>
        {member.user.email && (
          <p className='truncate text-xs text-muted-foreground'>{member.user.email}</p>
        )}
      </div>

      <ClubRoleBadge role={member.clubRole} themeColor={themeColor} size='sm' />

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
              <Icons.dots className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {canManage && member.clubRole === 'MEMBER' && (
              <DropdownMenuItem onClick={onPromote} disabled={isPromoting}>
                <Icons.arrowRight className='mr-2 h-3.5 w-3.5' />
                Promote to Moderator
              </DropdownMenuItem>
            )}
            {canManage && member.clubRole === 'MODERATOR' && (
              <DropdownMenuItem onClick={onDemote} disabled={isDemoting}>
                <Icons.minus className='mr-2 h-3.5 w-3.5' />
                Demote to Member
              </DropdownMenuItem>
            )}
            {(canManage || canKick) && member.clubRole !== 'OWNER' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onKick} className='text-destructive focus:text-destructive'>
                  <Icons.close className='mr-2 h-3.5 w-3.5' />
                  Remove from Club
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default MemberRow;
