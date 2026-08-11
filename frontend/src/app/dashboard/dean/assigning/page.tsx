'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy assigning / offerings URL → Dean Courses. */
export default function DeanAssigningRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/dean/courses')
  }, [router])
  return null
}
