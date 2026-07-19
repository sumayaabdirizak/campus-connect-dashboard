'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  MessageSquare,
  Hash,
  Megaphone,
  BookOpen,
  Users2,
  Bell,
  Archive,
  Search,
  Home,
  Star,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAnnouncementUnreadCount } from '@/features/announcements/api/queries'
import { useUnreadSummary } from '../../api/queries'

const NAV_ITEMS = [
  { id: 'home', href: '/dashboard/overview', Icon: Home, label: 'Home' },
  { id: 'chats', href: '/dashboard/chat', Icon: MessageSquare, label: 'Chats' },
  { id: 'channels', href: '/dashboard/chat', Icon: Hash, label: 'Channels' },
  {
    id: 'announcements',
    href: '/dashboard/chat?view=announcements',
    Icon: Megaphone,
    label: 'Announcements',
  },
  { id: 'courses', href: '/dashboard/courses', Icon: BookOpen, label: 'Courses' },
  { id: 'clubs', href: '/dashboard/clubs', Icon: Users2, label: 'Clubs' },
  { id: 'favorites', href: '/dashboard/chat?filter=favorites', Icon: Star, label: 'Favorites' },
] as const

const BOTTOM_ITEMS = [
  { id: 'notifications', href: '/dashboard/notifications', Icon: Bell, label: 'Notifications' },
  { id: 'archive', href: '/dashboard/messages', Icon: Archive, label: 'Archive' },
  { id: 'search', href: '/dashboard/chat', Icon: Search, label: 'Search' },
] as const

export function UnifiedSidebar() {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const view = searchParams?.get('view')
  const { data: unread } = useUnreadSummary()
  const { data: announcementUnread } = useAnnouncementUnreadCount()

  const totalUnread = (unread?.byGroup ?? []).reduce(
    (s, r) => s + (Number(r.unreadCount) || 0),
    0
  )
  const announcementBadge = announcementUnread?.unreadCount ?? 0

  function badge(id: string) {
    if (id === 'chats' || id === 'channels') return totalUnread
    if (id === 'announcements') return announcementBadge
    return 0
  }

  function isActive(id: string) {
    if (id === 'announcements') {
      return view === 'announcements' || pathname.startsWith('/dashboard/announcements')
    }
    if (id === 'favorites') return searchParams?.get('filter') === 'favorites'
    if (id === 'home') return pathname.startsWith('/dashboard/overview')
    if (id === 'courses') return pathname.startsWith('/dashboard/courses')
    if (id === 'clubs') return pathname.startsWith('/dashboard/clubs')
    if (id === 'chats' || id === 'channels') {
      return (
        pathname.startsWith('/dashboard/chat') &&
        view !== 'announcements' &&
        searchParams?.get('filter') !== 'favorites'
      )
    }
    return false
  }

  return (
    <aside
      aria-label='Communication navigation'
      className='flex h-full w-[var(--comm-rail-w)] shrink-0 flex-col items-center border-r border-border/80 bg-card/80 py-3 backdrop-blur-sm'
    >
      <div className='mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-xs font-bold tracking-tight text-primary-foreground shadow-sm'>
        CC
      </div>

      <nav
        className='flex w-full flex-1 flex-col items-center gap-0.5 px-2'
        aria-label='Primary'
      >
        {NAV_ITEMS.map(({ id, href, Icon, label }) => {
          const active = isActive(id)
          const count = badge(id)
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  className={cn(
                    'comm-rail-btn relative flex h-10 w-10 items-center justify-center rounded-xl',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className='h-[1.15rem] w-[1.15rem]' strokeWidth={active ? 2.25 : 2} />
                  {count > 0 ? (
                    <span
                      aria-label={`${count} unread`}
                      className={cn(
                        'absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums',
                        active
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary text-primary-foreground'
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  ) : null}
                </Link>
              </TooltipTrigger>
              <TooltipContent side='right' className='font-medium'>
                {label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className='flex flex-col items-center gap-0.5 px-2 pb-1'>
        <div className='mb-1.5 h-px w-7 bg-border' aria-hidden />
        {BOTTOM_ITEMS.map(({ id, href, Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                aria-label={label}
                className='comm-rail-btn flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <Icon className='h-4 w-4' />
              </Link>
            </TooltipTrigger>
            <TooltipContent side='right'>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </aside>
  )
}
