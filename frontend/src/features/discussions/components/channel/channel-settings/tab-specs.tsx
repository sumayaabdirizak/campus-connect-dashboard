import type { ReactNode } from 'react'
import { Icons } from '@/components/icons'
import type { DiscussionPermissions } from '../../../hooks/use-discussion-permissions'

export type TabKey = 'overview' | 'members' | 'permissions' | 'pins' | 'audit' | 'danger'

export type TabSpec = {
  value: TabKey
  label: string
  icon: ReactNode
  show: boolean
}

export function buildVisibleTabs(perms: DiscussionPermissions): TabSpec[] {
  const all: TabSpec[] = [
    {
      value: 'overview',
      label: 'Overview',
      icon: <Icons.settings className='h-3.5 w-3.5' />,
      show: perms.canManageChannel,
    },
    {
      value: 'members',
      label: 'Members',
      icon: <Icons.teams className='h-3.5 w-3.5' />,
      show: perms.canKickMembers || perms.canMuteMembers || perms.canModerateMembers,
    },
    {
      value: 'permissions',
      label: 'Permissions',
      icon: <Icons.lock className='h-3.5 w-3.5' />,
      show: perms.canManageRoles,
    },
    {
      value: 'pins',
      label: 'Pins',
      icon: <Icons.pin className='h-3.5 w-3.5' />,
      show: perms.canPin,
    },
    {
      value: 'audit',
      label: 'Audit log',
      icon: <Icons.post className='h-3.5 w-3.5' />,
      show: perms.canViewAuditLog,
    },
    {
      value: 'danger',
      label: 'Danger zone',
      icon: <Icons.warning className='h-3.5 w-3.5' />,
      show: perms.canManageChannel,
    },
  ]
  return all.filter((t) => t.show)
}
