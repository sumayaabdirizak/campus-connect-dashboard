'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useClubMembers,
  usePromoteMember,
  useDemoteMember,
  useKickMember,
} from '../../api/queries'
import { ClubRoleBadge } from '../club-role-badge'
import type { Club, ClubMember, ClubRole } from '../../api/types'

const ROLE_ORDER: Record<ClubRole, number> = {
  OWNER: 0,
  MODERATOR: 1,
  MEMBER: 2,
}

export function MembersTab({
  club,
  isOwner,
  isModerator,
}: {
  club: Club
  isOwner: boolean
  isModerator: boolean
}) {
  const { data, isLoading } = useClubMembers(club.id)
  const promoteMutation = usePromoteMember(club.id)
  const demoteMutation = useDemoteMember(club.id)
  const kickMutation = useKickMember(club.id)

  const [kickTarget, setKickTarget] = useState<ClubMember | null>(null)

  const members = [...(data?.members ?? [])].sort(
    (a, b) => (ROLE_ORDER[a.clubRole] ?? 9) - (ROLE_ORDER[b.clubRole] ?? 9)
  )

  const handlePromote = (userId: number) => promoteMutation.mutate(userId)
  const handleDemote = (userId: number) => demoteMutation.mutate(userId)
  const handleKick = () => {
    if (!kickTarget) return
    kickMutation.mutate(kickTarget.userId, {
      onSuccess: () => setKickTarget(null),
    })
  }

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
    )
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
            onPromote={() => handlePromote(member.userId)}
            onDemote={() => handleDemote(member.userId)}
            onKick={() => setKickTarget(member)}
            isPromoting={promoteMutation.isPending}
            isDemoting={demoteMutation.isPending}
          />
        ))}
      </div>

      {/* Kick confirmation dialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={() => setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{kickTarget?.user.full_name}</strong> from this club?
              They can rejoin if the club is open.
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
  )
}

function MemberRow({
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
  member: ClubMember
  themeColor: string
  canManage: boolean
  canKick: boolean
  onPromote: () => void
  onDemote: () => void
  onKick: () => void
  isPromoting: boolean
  isDemoting: boolean
}) {
  const showMenu = (canManage && member.clubRole !== 'OWNER') || (canKick && member.clubRole === 'MEMBER')

  return (
    <div className='flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50'>
      {/* Avatar */}
      <div
        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold'
        style={{
          backgroundColor: member.clubRole === 'OWNER' ? `${themeColor}20` : 'var(--muted)',
          color: member.clubRole === 'OWNER' ? themeColor : 'var(--muted-foreground)',
        }}
      >
        {member.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.user.avatarUrl}
            alt=''
            className='h-full w-full rounded-full object-cover'
          />
        ) : (
          member.user.full_name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('')
        )}
      </div>

      {/* Name + email */}
      <div className='flex-1 min-w-0'>
        <p className='truncate text-sm font-medium'>{member.user.full_name}</p>
        {member.user.email && (
          <p className='truncate text-xs text-muted-foreground'>{member.user.email}</p>
        )}
      </div>

      {/* Role badge */}
      <ClubRoleBadge role={member.clubRole} themeColor={themeColor} size='sm' />

      {/* Actions menu */}
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
              <Icons.dots className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {canManage && member.clubRole === 'MEMBER' && (
              <DropdownMenuItem
                onClick={onPromote}
                disabled={isPromoting}
              >
                <Icons.arrowRight className='mr-2 h-3.5 w-3.5' />
                Promote to Moderator
              </DropdownMenuItem>
            )}
            {canManage && member.clubRole === 'MODERATOR' && (
              <DropdownMenuItem
                onClick={onDemote}
                disabled={isDemoting}
              >
                <Icons.minus className='mr-2 h-3.5 w-3.5' />
                Demote to Member
              </DropdownMenuItem>
            )}
            {(canManage || canKick) && member.clubRole !== 'OWNER' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onKick}
                  className='text-destructive focus:text-destructive'
                >
                  <Icons.close className='mr-2 h-3.5 w-3.5' />
                  Remove from Club
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
