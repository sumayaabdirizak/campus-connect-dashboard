'use client'

import { useState } from 'react'
import { Clock, GraduationCap } from 'lucide-react'
import { Progress } from '@/features/ui/components/progress'
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url'
import { courseOfferingPath } from '@/lib/course-offering-href'

export interface StudentCourseCardData {
  id: number | string
  courseCode: string
  courseName: string
  instructor: string
  progress: number
  thumbnail: string | null
  schedule?: { day: number; time: string }[]
}

const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function StudentCourseCard({
  course,
}: {
  course: StudentCourseCardData
}) {
  const coverSrc = resolvePublicAssetUrl(course.thumbnail)
  const [coverFailed, setCoverFailed] = useState(false)
  const showCover = Boolean(coverSrc) && !coverFailed
  const schedule = course.schedule || []
  const initials = (course.courseCode || course.courseName || 'C')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className='group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border hover:bg-muted'>
      <a href={courseOfferingPath(course.id)} className='block'>
        <div className='relative h-36 w-full overflow-hidden bg-primary/10'>
          {showCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc!}
              alt={course.courseName}
              className='absolute inset-0 h-full w-full object-cover'
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center'>
              <span className='text-3xl font-bold tracking-tight text-primary'>
                {initials}
              </span>
            </div>
          )}
          <span className='absolute top-3 left-3 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-foreground'>
            {course.courseCode}
          </span>
        </div>

        <div className='space-y-3 p-4 pb-2'>
          <div>
            <h3 className='line-clamp-1 text-sm font-semibold text-foreground'>
              {course.courseName}
            </h3>
            <p className='mt-0.5 truncate text-xs text-muted-foreground'>
              {course.instructor}
            </p>
          </div>

          <div className='space-y-1.5'>
            <div className='flex items-center justify-between text-[11px]'>
              <span className='text-muted-foreground'>Progress</span>
              <span className='font-medium tabular-nums text-foreground'>
                {course.progress}%
              </span>
            </div>
            <Progress
              value={course.progress}
              className='h-1.5 bg-[#EEF2F6] [&>div]:bg-primary'
            />
          </div>

          {schedule.length > 0 ? (
            <p className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
              <Clock className='size-3.5 shrink-0' />
              <span className='truncate'>
                {schedule.map((s) => dayAbbr[s.day]).join(' / ')} —{' '}
                {schedule[0].time}
              </span>
            </p>
          ) : null}
        </div>
      </a>

      <div className='border-t border-border px-4 py-2.5'>
        <a
          href={courseOfferingPath(course.id, { tab: 'grades' })}
          className='inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline'
        >
          <GraduationCap className='size-3.5' aria-hidden />
          My report
        </a>
      </div>
    </div>
  )
}
