'use client'

import Link from 'next/link'
import { Icons } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { usePendingClubs } from '@/lib/clubs/queries'

/** Dean/super-admin shortcut into the club-approval queue, shown at the top of Discover. */
export function DiscoverPendingApprovalsLink() {
  const { data } = usePendingClubs()
  const count = data?.clubs?.length ?? 0

  if (count === 0) return null

  return (
    <Link
      href='/dashboard/dean/clubs'
      className='flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
    >
      <span className='flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300'>
        <Icons.alertCircle className='size-4' />
        Club applications awaiting your review
      </span>
      <Badge variant='secondary' className='bg-amber-500 text-white'>
        {count}
      </Badge>
    </Link>
  )
}

export default DiscoverPendingApprovalsLink
