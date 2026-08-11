'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card'
import { Skeleton } from '@/features/ui/components/skeleton'
import { Button } from '@/features/ui/components/button'
import type { DeadlineRow } from '@/components/calendar/lib'
import { timelineHrefFor } from './timeline-block/types'
import { InsightListItem } from './insight-list-motion'

function formatDue(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) {
    return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Right-rail deadlines — Pharmacy card + light enter motion. */
export function StudentDashboardDeadlines({
  items,
  loading,
}: {
  items: DeadlineRow[]
  loading?: boolean
}) {
  const weekEnd = Date.now() + 7 * 24 * 60 * 60 * 1000
  const upcoming = items
    .filter((d) => d.deadlineAt && new Date(d.deadlineAt).getTime() <= weekEnd)
    .slice(0, 6)

  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 border-b py-3'>
        <div className='flex items-center gap-2'>
          <CalendarClock className='size-4 text-muted-foreground' />
          <CardTitle className='text-sm font-semibold'>Due this week</CardTitle>
        </div>
        <Button variant='ghost' size='sm' className='h-8 text-xs' asChild>
          <Link href='/dashboard/calendar'>Calendar</Link>
        </Button>
      </CardHeader>
      <CardContent className='pt-2'>
        {loading ? (
          <div className='space-y-2 py-2'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-10 w-full' />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <p className='py-5 text-center text-sm text-muted-foreground'>Nothing due this week.</p>
        ) : (
          <ul className='divide-y divide-border'>
            {upcoming.map((item, i) => (
              <InsightListItem key={`${item.kind}-${item.id}`} index={i}>
                <Link
                  href={timelineHrefFor(item)}
                  className='flex items-start justify-between gap-2 py-2.5 hover:bg-muted/40'
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-primary hover:underline'>
                      {item.title}
                    </p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {item.kind === 'quiz' ? 'Quiz' : 'Assignment'}
                      {item.courseCode ? ` · ${item.courseCode}` : ''}
                    </p>
                  </div>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {formatDue(item.deadlineAt)}
                  </span>
                </Link>
              </InsightListItem>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

