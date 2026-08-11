'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card'
import { Badge } from '@/features/ui/components/badge'
import { InsightListItem } from './insight-list-motion'

export function AnnouncementsSidebarCard({
  announcements,
}: {
  announcements: { id: string | number; title: string; isNew?: boolean }[]
}) {
  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row items-center gap-2 border-b py-3'>
        <Bell className='size-4 text-muted-foreground' />
        <CardTitle className='text-base font-semibold'>Latest announcements</CardTitle>
      </CardHeader>
      <CardContent className='pt-3'>
        {announcements.length > 0 ? (
          <ul className='divide-y divide-border'>
            {announcements.slice(0, 4).map((a, i) => (
              <InsightListItem key={a.id} index={i}>
                <Link
                  href='/dashboard/announcements'
                  className='flex items-start gap-2 py-2.5 transition-colors hover:bg-muted/40'
                >
                  {a.isNew ? (
                    <Badge
                      variant='secondary'
                      className='mt-0.5 shrink-0 px-1.5 py-0 text-[10px] uppercase'
                    >
                      New
                    </Badge>
                  ) : null}
                  <span className='line-clamp-2 text-sm text-primary hover:underline'>
                    {a.title}
                  </span>
                </Link>
              </InsightListItem>
            ))}
          </ul>
        ) : (
          <p className='py-4 text-center text-sm text-muted-foreground'>No announcements.</p>
        )}
      </CardContent>
    </Card>
  )
}
