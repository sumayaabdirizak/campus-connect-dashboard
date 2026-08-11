'use client'

import { Suspense } from 'react'
import { DeanCoursesPage } from '@/components/dean/dean-courses-page'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DeanCoursesPage />
    </Suspense>
  )
}

