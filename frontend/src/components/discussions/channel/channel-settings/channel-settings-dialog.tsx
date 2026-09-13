'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/components/dialog'
import { Tabs } from '@/features/ui/components/tabs'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useDiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'
import type { DiscussionChannel } from '@/lib/discussions/queries/types'
import { ChannelSettingsTabs } from './channel-settings-tabs'
import { buildVisibleTabs } from './tab-specs'

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  channel,
  myPermissions,
  myServerPermissions,
  onChannelHardDeleted,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  channel: DiscussionChannel | null
  myPermissions: string | null | undefined
  myServerPermissions?: string | null | undefined
  onChannelHardDeleted?: () => void
}) {
  const perms = useDiscussionPermissions(myPermissions)
  const visibleTabs = useMemo(() => buildVisibleTabs(perms), [perms])
  const defaultTab = visibleTabs[0]?.value ?? 'overview'

  if (!channel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden p-0',
          'rounded-xl border border-border sm:max-w-lg',
          '[&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4'
        )}
      >
        <DialogHeader className='shrink-0 space-y-0 border-b border-border bg-muted px-5 pt-5 pb-4 pr-12 text-left'>
          <DialogTitle className='flex items-center gap-3 text-base font-bold text-foreground'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white'>
              <Icons.hash className='size-4 text-white' />
            </span>
            <span className='min-w-0'>
              <span className='block truncate'>Channel settings</span>
              <span className='mt-0.5 block truncate font-mono text-xs font-normal text-muted-foreground'>
                #{channel.name}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Edit settings for #{channel.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue={defaultTab}
          className='flex min-h-0 flex-1 flex-col gap-0'
        >
          <ChannelSettingsTabs
            visibleTabs={visibleTabs}
            channel={channel}
            perms={perms}
            myPermissions={myPermissions}
            myServerPermissions={myServerPermissions}
            onOpenChange={onOpenChange}
            onChannelHardDeleted={onChannelHardDeleted}
          />
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
