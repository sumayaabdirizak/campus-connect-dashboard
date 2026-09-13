'use client'

import { Skeleton } from '@/features/ui/components/skeleton'
import { Icons } from '@/components/icons'
import { CourseCard, type TeacherCourseCardData } from './course-card'

export function CourseList({
  courses,
  isLoading,
}: {
  courses: TeacherCourseCardData[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className='h-72 rounded-xl border border-border'
          />
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-14 text-center'>
        <span className='flex size-10 items-center justify-center rounded-full bg-muted'>
          <Icons.billing className='size-4 text-muted-foreground' />
        </span>
        <p className='text-sm font-medium text-foreground'>No courses yet</p>
        <p className='text-xs text-muted-foreground'>
          Courses assigned to you will show up here.
        </p>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}
