'use client'

import Link from 'next/link'
import { Bell, Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card'
import { Button } from '@/features/ui/components/button'
import { Skeleton } from '@/features/ui/components/skeleton'
import type { Announcement } from '@/lib/announcements/types'
import { PriorityBadge } from '@/components/announcements/announcement-priority-badge'
import { relativeTime } from '@/lib/format-time'
import { cn } from '@/lib/utils'
import { InsightListItem } from './insight-list-motion'

function excerpt(a: Announcement): string {
  const raw = a.bodyMarkdown || a.content || a.bodyHtml || ''
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function authorMeta(a: Announcement): string {
  const name = a.createdBy?.name || a.author?.full_name
  const role = a.createdBy?.role || a.author?.role?.name
  const roleLabel = role ? String(role).replace(/_/g, ' ') : ''
  if (name && roleLabel) return `${name} · ${roleLabel}`
  return name || 'Campus staff'
}

function postedAt(a: Announcement): string {
  const iso = a.publishedAt || a.createdAt || a.created_at
  return iso ? relativeTime(iso) : ''
}

export function AnnouncementsSidebarCard({
  announcements,
  loading,
}: {
  announcements: Announcement[]
  loading?: boolean
}) {
  const items = announcements.slice(0, 4)

  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 border-b py-3'>
        <div className='flex items-center gap-2'>
          <Bell className='size-4 text-primary' />
          <CardTitle className='text-sm font-semibold'>Latest announcements</CardTitle>
        </div>
        <Button variant='ghost' size='sm' className='h-8 text-xs' asChild>
          <Link href='/dashboard/announcements'>View all</Link>
        </Button>
      </CardHeader>
      <CardContent className='pt-2'>
        {loading ? (
          <div className='space-y-2 py-2'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-14 w-full' />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center gap-2 py-8 text-center'>
            <Megaphone className='size-8 text-muted-foreground/40' aria-hidden />
            <p className='text-sm text-muted-foreground'>No announcements yet.</p>
            <Button variant='outline' size='sm' asChild>
              <Link href='/dashboard/announcements'>Browse announcements</Link>
            </Button>
          </div>
        ) : (
          <ul className='divide-y divide-border'>
            {items.map((a, i) => {
              const unread = a.isNew || !a.isRead
              const preview = excerpt(a)
              return (
                <InsightListItem key={a.id} index={i}>
                  <Link
                    href='/dashboard/announcements'
                    className={cn(
                      'group flex items-start gap-3 py-3 transition-colors hover:bg-muted/40',
                      unread && 'bg-primary/[0.03]'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-2 size-2 shrink-0 rounded-full',
                        unread ? 'bg-primary' : 'bg-muted-foreground/30'
                      )}
                      aria-hidden
                    />
                    <div className='min-w-0 flex-1'>
                      <div className='mb-0.5 flex flex-wrap items-center gap-1.5'>
                        <PriorityBadge priority={a.priority} />
                        {unread ? (
                          <span className='text-[10px] font-semibold uppercase tracking-wide text-primary'>
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className='line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary'>
                        {a.title}
                      </p>
                      {preview ? (
                        <p className='mt-0.5 line-clamp-1 text-xs text-muted-foreground'>
                          {preview}
                        </p>
                      ) : null}
                      <p className='mt-1 text-[11px] text-muted-foreground'>{authorMeta(a)}</p>
                    </div>
                    <span className='shrink-0 pt-0.5 text-[11px] text-muted-foreground'>
                      {postedAt(a)}
                    </span>
                  </Link>
                </InsightListItem>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
