'use client'

import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DiscussionChannel } from '../../../api/types'
import type { DiscussionPermissions } from '../../../hooks/use-discussion-permissions'
import { OverviewTab } from '../manage/overview-tab'
import { MembersTab } from '../manage/members-tab'
import { PermissionsTab } from '../manage/permissions-tab'
import { PinsTab } from '../manage/pins-tab'
import { DangerZoneTab } from '../manage/danger-zone-tab'
import { AuditLogTab } from '../manage/audit-log-tab'
import type { TabSpec } from './tab-specs'

export function ChannelSettingsTabs({
  visibleTabs,
  channel,
  perms,
  myPermissions,
  myServerPermissions,
  onOpenChange,
  onChannelHardDeleted,
  onJumpToPinnedMessage,
}: {
  visibleTabs: TabSpec[]
  channel: DiscussionChannel
  perms: DiscussionPermissions
  myPermissions: string | null | undefined
  myServerPermissions?: string | null | undefined
  onOpenChange: (next: boolean) => void
  onChannelHardDeleted?: () => void
  onJumpToPinnedMessage?: (messageId: number) => void
}) {
  return (
    <>
      <TabsList className='w-full'>
        {visibleTabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className='gap-1.5'>
            {t.icon}
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className='max-h-[60vh] overflow-y-auto pr-1'>
        {perms.canManageChannel && (
          <TabsContent value='overview' forceMount className='data-[state=inactive]:hidden'>
            <OverviewTab
              channel={channel}
              canManageRoles={perms.canManageRoles}
              onSaved={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        )}

        {(perms.canKickMembers || perms.canMuteMembers || perms.canModerateMembers) && (
          <TabsContent value='members' forceMount className='data-[state=inactive]:hidden'>
            <MembersTab channel={channel} myPermissions={myPermissions} />
          </TabsContent>
        )}

        {perms.canManageRoles && (
          <TabsContent value='permissions' forceMount className='data-[state=inactive]:hidden'>
            <PermissionsTab channel={channel} />
          </TabsContent>
        )}

        {perms.canPin && (
          <TabsContent value='pins' forceMount className='data-[state=inactive]:hidden'>
            <PinsTab
              channelId={channel.id}
              canManagePins={perms.canPin}
              onJumpToMessage={(messageId) => {
                onOpenChange(false)
                onJumpToPinnedMessage?.(messageId)
              }}
            />
          </TabsContent>
        )}

        {perms.canViewAuditLog && (
          <TabsContent value='audit' forceMount className='data-[state=inactive]:hidden'>
            <AuditLogTab channelId={channel.id} />
          </TabsContent>
        )}

        {perms.canManageChannel && (
          <TabsContent value='danger' forceMount className='data-[state=inactive]:hidden'>
            <DangerZoneTab
              channel={channel}
              myChannelPermissions={myPermissions}
              myServerPermissions={myServerPermissions ?? null}
              onArchiveSuccess={() => onOpenChange(false)}
              onChannelHardDeleted={onChannelHardDeleted}
            />
          </TabsContent>
        )}
      </div>
    </>
  )
}
