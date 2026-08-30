'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { scheduleRouterReplace } from '@/lib/safe-router-navigation'

/** Legacy assigning / offerings URL → Dean Courses. */
export default function DeanAssigningRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    scheduleRouterReplace(router, '/dashboard/dean/courses')
  }, [router])
  return null
}
