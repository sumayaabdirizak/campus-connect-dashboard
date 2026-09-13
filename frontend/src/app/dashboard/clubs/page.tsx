'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { messagesDiscoverHref } from '@/lib/inbox/services/messages-href'
import { scheduleRouterReplace } from '@/lib/safe-router-navigation'

/** Clubs discover always lives in Messages (Chats + Discover pane). */
export default function ClubsPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    scheduleRouterReplace(router, messagesDiscoverHref())
  }, [router])

  return (
    <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
      Opening Chats…
    </div>
  )
}
