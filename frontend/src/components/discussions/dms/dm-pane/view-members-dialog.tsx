'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar'
import { Button } from '@/features/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog'
import { Icons } from '@/components/icons'
import { X } from 'lucide-react'
import { Switch } from '@/features/ui/components/switch'
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url'
import { useRemoveGroupDmMember, useSetGroupDmMemberCanPost } from '@/lib/discussions/queries/queries'
import type { GroupDmMember } from '@/lib/discussions/queries/types'
import { initialsFor } from './dm-pane-helpers'

export function ViewMembersDialog({
  open,
  onOpenChange,
  groupDmId,
  members,
  myUserId,
  isOwner
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  groupDmId: string
  members: GroupDmMember[]
  myUserId: number | null
  isOwner: boolean
}) {
  const removeMember = useRemoveGroupDmMember(groupDmId)
  const setCanPost = useSetGroupDmMemberCanPost(groupDmId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[min(80dvh,600px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md'>
        <DialogHeader className='shrink-0 border-b bg-background px-6 pt-6 pb-4 pr-12 text-left'>
          <DialogTitle>Members</DialogTitle>
          <DialogDescription>
            {members.length} {members.length === 1 ? 'person' : 'people'} in this conversation.
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto'>
          {members.map((m) => {
            const name = m.user?.full_name ?? `Member ${m.userId}`
            const src = resolvePublicAssetUrl(m.user?.avatarUrl)
            const canRemove = isOwner && m.userId !== myUserId
            const canManagePosting = isOwner && m.userId !== myUserId && m.role !== 'OWNER'
            return (
              <div
                key={m.userId}
                className='flex items-center gap-3 px-6 py-3 hover:bg-muted'
              >
                <Avatar className='size-9 shrink-0'>
                  {src ? <AvatarImage src={src} alt={name} /> : null}
                  <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
                    {initialsFor(name)}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-foreground'>
                    {name}
                    {m.userId === myUserId ? ' (You)' : ''}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {m.role === 'OWNER' ? 'Owner' : 'Member'}
                    {m.canPost === false ? ' · Can’t send messages' : ''}
                  </p>
                </div>
                {canManagePosting ? (
                  <Switch
                    checked={m.canPost}
                    disabled={setCanPost.isPending}
                    aria-label={m.canPost ? `Mute ${name}` : `Unmute ${name}`}
                    onCheckedChange={(checked) =>
                      setCanPost.mutate({ targetUserId: m.userId, canPost: checked })
                    }
                  />
                ) : null}
                {canRemove ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-8 shrink-0 text-muted-foreground hover:text-destructive'
                    aria-label={`Remove ${name}`}
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(m.userId)}
                  >
                    {removeMember.isPending ? (
                      <Icons.spinner className='size-4 animate-spin' />
                    ) : (
                      <X className='size-4' />
                    )}
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
