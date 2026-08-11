'use client'

import { useRouter } from 'next/navigation'
import { Compass, MessageSquareDashed } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import { messagesDiscoverHref } from '@/lib/inbox/services/messages-href'
import type { InboxFilter } from './inbox-helpers'

type Props = {
  filter: InboxFilter
  hasSearch: boolean
  onDiscover?: () => void
  showDiscover?: boolean
}

export function InboxListEmpty({
  filter,
  hasSearch,
  onDiscover,
  showDiscover = true
}: Props) {
  const router = useRouter()

  if (showDiscover && filter === 'club' && !hasSearch) {
    return (
      <div className='flex h-full min-h-full flex-col items-center justify-center gap-3 px-6 py-14 text-center'>
        <div className='flex size-12 items-center justify-center rounded-full bg-[#EFF6FF]'>
          <Compass className='size-6 text-[#3B82F6]' />
        </div>
        <div className='space-y-1'>
          <p className='text-sm font-medium text-[#101828]'>
            Discover clubs for your interests
          </p>
          <p className='text-xs text-[#667085]'>
            Browse campus clubs and join ones that match what you care about.
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          className='mt-1 rounded-full bg-[#3B82F6] px-4 text-white hover:bg-[#2563EB]'
          onClick={() => {
            if (onDiscover) onDiscover()
            else router.push(messagesDiscoverHref())
          }}
        >
          Discover clubs
        </Button>
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center'>
      <MessageSquareDashed className='size-8 text-[#D0D5DD]' />
      <p className='text-sm text-[#667085]'>
        {hasSearch || filter !== 'all'
          ? 'No conversations match.'
          : 'No conversations yet.'}
      </p>
    </div>
  )
}
