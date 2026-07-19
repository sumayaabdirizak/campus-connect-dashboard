'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs } from '@/components/ui/tabs'
import { useDiscussionPermissions } from '../../../hooks/use-discussion-permissions'
import type { DiscussionChannel } from '../../../api/types'
import { ChannelSettingsTabs } from './channel-settings-tabs'
import { buildVisibleTabs } from './tab-specs'

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  channel,
  myPermissions,
  myServerPermissions,
  onChannelHardDeleted,
  onJumpToPinnedMessage,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  channel: DiscussionChannel | null
  myPermissions: string | null | undefined
  myServerPermissions?: string | null | undefined
  onChannelHardDeleted?: () => void
  onJumpToPinnedMessage?: (messageId: number) => void
}) {
  const perms = useDiscussionPermissions(myPermissions)
  const visibleTabs = useMemo(() => buildVisibleTabs(perms), [perms])
  const defaultTab = visibleTabs[0]?.value ?? 'overview'

  if (!channel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            Manage <span className='font-mono'>#{channel.name}</span>
          </DialogTitle>
          <DialogDescription>
            Configure this channel. Members see most changes in real time.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className='gap-4'>
          <ChannelSettingsTabs
            visibleTabs={visibleTabs}
            channel={channel}
            perms={perms}
            myPermissions={myPermissions}
            myServerPermissions={myServerPermissions}
            onOpenChange={onOpenChange}
            onChannelHardDeleted={onChannelHardDeleted}
            onJumpToPinnedMessage={onJumpToPinnedMessage}
          />
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
