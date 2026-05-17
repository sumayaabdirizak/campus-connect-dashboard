'use client'

import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import type { ClubRole } from '../api/types'

const ROLE_CONFIG: Record<ClubRole, {
  label: string
  icon: React.ReactNode
  variant: 'default' | 'secondary' | 'outline'
  className: string
}> = {
  OWNER: {
    label: 'Owner',
    icon: <Icons.pro className='h-3 w-3' />,
    variant: 'default',
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:border-amber-400/30'
  },
  MODERATOR: {
    label: 'Moderator',
    icon: <Icons.badgeCheck className='h-3 w-3' />,
    variant: 'secondary',
    className: 'bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300 dark:border-blue-400/30'
  },
  MEMBER: {
    label: 'Member',
    icon: null,
    variant: 'outline',
    className: ''
  }
}

export function ClubRoleBadge({
  role,
  themeColor,
  size = 'default'
}: {
  role: ClubRole
  themeColor?: string
  size?: 'default' | 'sm'
}) {
  const config = ROLE_CONFIG[role]
  if (!config) return null

  return (
    <Badge
      variant='outline'
      className={`
        inline-flex items-center gap-1 shrink-0
        ${size === 'sm' ? 'h-4 px-1.5 text-[9px]' : 'h-5 px-2 text-[10px]'}
        ${config.className}
      `}
    >
      {config.icon}
      {config.label}
    </Badge>
  )
}
