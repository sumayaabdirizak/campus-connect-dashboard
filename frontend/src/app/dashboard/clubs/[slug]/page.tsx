'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { messagesClubHref } from '@/lib/inbox/services/messages-href'
import { scheduleRouterReplace } from '@/lib/safe-router-navigation'

/** Legacy club URL → Messages shell (Chats + club). */
export default function ClubSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()

  useEffect(() => {
    if (slug) scheduleRouterReplace(router, messagesClubHref(slug))
  }, [router, slug])

  return (
    <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
      Opening club…
      </div>
  )
}
