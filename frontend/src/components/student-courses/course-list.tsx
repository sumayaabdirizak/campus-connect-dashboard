'use client'

import { Skeleton } from '@/features/ui/components/skeleton'
import { Icons } from '@/components/icons'
import {
  StudentCourseCard,
  type StudentCourseCardData,
} from './course-card'

export function StudentCourseList({
  courses,
  isLoading,
}: {
  courses: StudentCourseCardData[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className='h-72 rounded-xl border border-[#E5E7EB]'
          />
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E5E7EB] bg-white py-14 text-center'>
        <span className='flex size-10 items-center justify-center rounded-full bg-[#F8FAFC]'>
          <Icons.billing className='size-4 text-[#9CA3AF]' />
        </span>
        <p className='text-sm font-medium text-[#101828]'>No courses yet</p>
        <p className='text-xs text-[#667085]'>
          Courses for your section and semester will show here once you are
          registered and teachers are assigned.
        </p>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {courses.map((course) => (
        <StudentCourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}
