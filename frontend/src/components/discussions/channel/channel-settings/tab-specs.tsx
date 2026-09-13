import type { ReactNode } from 'react'
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'

export type TabKey = 'overview' | 'members' | 'permissions' | 'danger'

export type TabSpec = {
  value: TabKey
  label: string
  icon?: ReactNode
  show: boolean
}

export function buildVisibleTabs(perms: DiscussionPermissions): TabSpec[] {
  return [
    {
      value: 'overview' as const,
      label: 'General',
      show: perms.canManageChannel,
    },
    {
      value: 'members' as const,
      label: 'Members',
      show:
        perms.canKickMembers || perms.canModerateMembers,
    },
    {
      value: 'permissions' as const,
      label: 'Permissions',
      show: perms.canManageRoles,
    },
    {
      value: 'danger' as const,
      label: 'Danger',
      show: perms.canManageChannel,
    },
  ].filter((t) => t.show)
}
