'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Building2,
  ScrollText,
  Settings,
  Shield,
  UserCog,
  Users,
  Megaphone,
} from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuickActionItem {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

/** Super Admin ops shortcuts (platform management). */
export const MAIN_DASHBOARD_QUICK_ACTIONS: QuickActionItem[] = [
  {
    icon: Users,
    title: 'Manage users',
    description: 'Students, teachers, and staff accounts',
    href: '/dashboard/users',
  },
  {
    icon: Building2,
    title: 'Faculties',
    description: 'University faculties & structure',
    href: '/dashboard/faculties',
  },
  {
    icon: Shield,
    title: 'Roles & access',
    description: 'Permissions and role assignments',
    href: '/dashboard/admin/roles',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Platform analytics & exports',
    href: '/dashboard/admin/report',
  },
  {
    icon: ScrollText,
    title: 'Audit logs',
    description: 'System activity history',
    href: '/dashboard/audit-logs',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    description: 'Broadcast notices campus-wide',
    href: '/dashboard/announcements',
  },
  {
    icon: UserCog,
    title: 'Courses catalogue',
    description: 'University course catalogue',
    href: '/dashboard/courses',
  },
  {
    icon: Settings,
    title: 'Profile',
    description: 'Your account preferences',
    href: '/dashboard/profile',
  },
]

export function DashboardQuickActions({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {MAIN_DASHBOARD_QUICK_ACTIONS.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className='group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]'
        >
          <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <action.icon className='size-4' aria-hidden />
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold text-foreground'>{action.title}</p>
            <p className='truncate text-xs text-muted-foreground'>{action.description}</p>
          </div>
          <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary' />
        </Link>
      ))}
    </div>
  )
}
