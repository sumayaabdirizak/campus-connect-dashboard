'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

const LINKS = [
  { title: 'Courses', href: '/dashboard/courses' },
  { title: 'Calendar', href: '/dashboard/calendar' },
  { title: 'Messages', href: '/dashboard/messages' },
  { title: 'Clubs', href: '/dashboard/messages?discover=1' },
  { title: 'Announcements', href: '/dashboard/announcements' },
  { title: 'Profile', href: '/dashboard/profile' },
]

/** Soft pill links — theme tokens only. */
export function StudentDashboardQuickLinks({ className }: { className?: string }) {
  return (
    <nav aria-label='Quick links' className={cn('flex flex-wrap gap-2', className)}>
      {LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className='rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
