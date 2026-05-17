'use client'

import { Icons } from '@/components/icons'

export function ClubPendingBanner({ clubName }: { clubName?: string }) {
  return (
    <div className='flex items-center gap-2 border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-700 dark:text-yellow-400'>
      <Icons.clock className='h-3.5 w-3.5 shrink-0' />
      <span>
        <strong>{clubName ?? 'This club'}</strong> is pending approval.
        A dean will review your application soon.
      </span>
    </div>
  )
}
