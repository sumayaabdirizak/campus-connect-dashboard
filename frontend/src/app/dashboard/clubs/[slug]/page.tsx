'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { messagesClubHref } from '@/lib/inbox/services/messages-href'

/** Legacy club URL → Messages shell (Chats + club). */
export default function ClubSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()

  useEffect(() => {
    if (slug) router.replace(messagesClubHref(slug))
  }, [router, slug])

  return (
    <div className='flex flex-1 items-center justify-center text-sm text-[#667085]'>
      Opening club…
    </div>
  )
}
