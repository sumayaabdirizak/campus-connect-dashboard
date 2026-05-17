'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  useClubInvites,
  useCreateInvite,
  useRevokeInvite,
} from '../../api/queries'
import type { Club, ClubInvite } from '../../api/types'

export function InvitesTab({ club }: { club: Club }) {
  const { data, isLoading } = useClubInvites(club.id)
  const createMutation = useCreateInvite(club.id)
  const revokeMutation = useRevokeInvite(club.id)

  const invites = data?.invites ?? []
  const linkInvites = invites.filter((i) => !i.inviteeUserId)
  const directInvites = invites.filter((i) => !!i.inviteeUserId)

  const handleCreateLink = () => {
    createMutation.mutate({}, {
      onSuccess: (data) => {
        const url = `${window.location.origin}${data.invite.inviteUrl}`
        navigator.clipboard.writeText(url).then(() => {
          toast.success('Invite link copied to clipboard!')
        }).catch(() => {
          toast.success('Invite link created!')
        })
      },
    })
  }

  const handleCopyLink = (inviteUrl: string) => {
    const url = `${window.location.origin}${inviteUrl}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!')
    }).catch(() => {
      toast.error('Failed to copy')
    })
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <Skeleton className='h-16 rounded-lg' />
        <Skeleton className='h-16 rounded-lg' />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Generate link section */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-sm font-medium'>Invite Links</h3>
            <p className='text-xs text-muted-foreground'>
              Generate a link anyone can use to join this club
            </p>
          </div>
          <Button
            size='sm'
            onClick={handleCreateLink}
            disabled={createMutation.isPending}
            style={{ backgroundColor: club.themeColor || '#6366f1' }}
          >
            {createMutation.isPending ? (
              <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            ) : (
              <Icons.add className='mr-1.5 h-3.5 w-3.5' />
            )}
            Generate Link
          </Button>
        </div>

        {linkInvites.length === 0 ? (
          <div className='rounded-lg border border-dashed p-6 text-center'>
            <Icons.share className='mx-auto mb-2 h-6 w-6 text-muted-foreground/50' />
            <p className='text-xs text-muted-foreground'>
              No active invite links. Generate one to share!
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {linkInvites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onCopy={() => handleCopyLink(invite.inviteUrl)}
                onRevoke={() => revokeMutation.mutate(invite.id)}
                isRevoking={revokeMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Direct invites */}
      {directInvites.length > 0 && (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium'>Direct Invites</h3>
          <div className='space-y-2'>
            {directInvites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onRevoke={() => revokeMutation.mutate(invite.id)}
                isRevoking={revokeMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InviteRow({
  invite,
  onCopy,
  onRevoke,
  isRevoking,
}: {
  invite: ClubInvite
  onCopy?: () => void
  onRevoke: () => void
  isRevoking: boolean
}) {
  const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date()
  const expiresLabel = invite.expiresAt
    ? `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`
    : 'No expiry'

  return (
    <div className='flex items-center gap-3 rounded-lg border px-3 py-2.5'>
      <div className='flex-1 min-w-0'>
        {invite.invitee ? (
          <p className='truncate text-sm font-medium'>
            {invite.invitee.full_name}
            {invite.invitee.email && (
              <span className='ml-1 text-xs text-muted-foreground'>
                ({invite.invitee.email})
              </span>
            )}
          </p>
        ) : (
          <p className='truncate text-sm font-medium font-mono text-muted-foreground'>
            ...{invite.token.slice(-8)}
          </p>
        )}
        <div className='flex items-center gap-2 text-[10px] text-muted-foreground'>
          <span>by {invite.inviter?.full_name ?? 'Unknown'}</span>
          <span>&middot;</span>
          <span>{expiresLabel}</span>
          {isExpired && (
            <Badge variant='destructive' className='h-3.5 px-1 text-[8px]'>
              Expired
            </Badge>
          )}
        </div>
      </div>

      <div className='flex gap-1'>
        {onCopy && !isExpired && (
          <Button
            variant='ghost'
            size='sm'
            className='h-7 w-7 p-0'
            onClick={onCopy}
            title='Copy link'
          >
            <Icons.share className='h-3.5 w-3.5' />
          </Button>
        )}
        <Button
          variant='ghost'
          size='sm'
          className='h-7 w-7 p-0 text-destructive hover:text-destructive'
          onClick={onRevoke}
          disabled={isRevoking}
          title='Revoke'
        >
          <Icons.close className='h-3.5 w-3.5' />
        </Button>
      </div>
    </div>
  )
}
