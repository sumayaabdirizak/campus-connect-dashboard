'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card'
import { Skeleton } from '@/features/ui/components/skeleton'
import { Button } from '@/features/ui/components/button'
import { useInbox } from '@/lib/inbox/queries'
import { isClubInboxRow } from '@/components/inbox/inbox-helpers'
import type { InboxRow } from '@/lib/inbox/types'
import { InsightListItem } from './insight-list-motion'

const SCOPE_ORDER: Record<string, number> = {
  Batch: 0,
  Section: 1,
  Department: 2,
  Faculty: 3,
}

function academicGroups(rows: InboxRow[] | undefined): InboxRow[] {
  return (rows ?? [])
    .filter((r) => r.type === 'group' && !isClubInboxRow(r))
    .sort(
      (a, b) =>
        (SCOPE_ORDER[a.subtitle ?? ''] ?? 9) - (SCOPE_ORDER[b.subtitle ?? ''] ?? 9)
    )
}

/** Right-rail academic groups — Pharmacy card + light enter motion. */
export function StudentDashboardGroups() {
  const { data, isLoading } = useInbox()
  const groups = academicGroups(data?.rows).slice(0, 6)

  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 border-b py-3'>
        <div className='flex items-center gap-2'>
          <Users className='size-4 text-muted-foreground' />
          <CardTitle className='text-sm font-semibold'>My groups</CardTitle>
        </div>
        <Button variant='ghost' size='sm' className='h-8 text-xs' asChild>
          <Link href='/dashboard/messages'>Messages</Link>
        </Button>
      </CardHeader>
      <CardContent className='pt-2'>
        {isLoading ? (
          <div className='space-y-2 py-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-10 w-full' />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className='py-5 text-center text-sm text-muted-foreground'>
            No academic groups yet.
          </p>
        ) : (
          <ul className='divide-y divide-border'>
            {groups.map((g, i) => (
              <InsightListItem key={g.key} index={i}>
                <Link
                  href={g.href}
                  className='flex items-center justify-between gap-2 py-2.5 hover:bg-muted/40'
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-primary hover:underline'>
                      {g.title}
                    </p>
                    <p className='text-xs text-muted-foreground'>{g.subtitle ?? 'Group'}</p>
                  </div>
                  {g.unreadCount > 0 ? (
                    <span className='rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary'>
                      {g.unreadCount}
                    </span>
                  ) : null}
                </Link>
              </InsightListItem>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
