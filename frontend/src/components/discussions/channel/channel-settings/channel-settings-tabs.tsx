'use client'

import { TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs'
import type { DiscussionChannel } from '@/lib/discussions/queries/types'
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'
import { OverviewTab } from '@/components/discussions/channel/manage/overview-tab'
import { MembersTab } from '@/components/discussions/channel/manage/members-tab'
import { PermissionsTab } from '@/components/discussions/channel/manage/permissions-tab'
import { DangerZoneTab } from '@/components/discussions/channel/manage/danger-zone-tab'
import type { TabSpec } from './tab-specs'

export function ChannelSettingsTabs({
  visibleTabs,
  channel,
  perms,
  myPermissions,
  myServerPermissions,
  onOpenChange,
  onChannelHardDeleted,
}: {
  visibleTabs: TabSpec[]
  channel: DiscussionChannel
  perms: DiscussionPermissions
  myPermissions: string | null | undefined
  myServerPermissions?: string | null | undefined
  onOpenChange: (next: boolean) => void
  onChannelHardDeleted?: () => void
}) {
  return (
    <>
      <TabsList className='h-auto w-full shrink-0 justify-start gap-0 rounded-none border-b border-[#E5E7EB] bg-white p-0 px-2'>
        {visibleTabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className='rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs font-medium text-[#667085] shadow-none data-[state=active]:border-[#3B82F6] data-[state=active]:bg-transparent data-[state=active]:text-[#101828] data-[state=active]:shadow-none'
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className='min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4'>
        {perms.canManageChannel ? (
          <TabsContent
            value='overview'
            forceMount
            className='m-0 data-[state=inactive]:hidden'
          >
            <OverviewTab
              channel={channel}
              canManageRoles={perms.canManageRoles}
              onSaved={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        ) : null}

        {perms.canKickMembers || perms.canModerateMembers ? (
          <TabsContent
            value='members'
            forceMount
            className='m-0 data-[state=inactive]:hidden'
          >
            <MembersTab channel={channel} myPermissions={myPermissions} />
          </TabsContent>
        ) : null}

        {perms.canManageRoles ? (
          <TabsContent
            value='permissions'
            forceMount
            className='m-0 data-[state=inactive]:hidden'
          >
            <PermissionsTab channel={channel} />
          </TabsContent>
        ) : null}

        {perms.canManageChannel ? (
          <TabsContent
            value='danger'
            forceMount
            className='m-0 data-[state=inactive]:hidden'
          >
            <DangerZoneTab
              channel={channel}
              myChannelPermissions={myPermissions}
              myServerPermissions={myServerPermissions ?? null}
              onArchiveSuccess={() => onOpenChange(false)}
              onChannelHardDeleted={onChannelHardDeleted}
            />
          </TabsContent>
        ) : null}
      </div>
    </>
  )
}
