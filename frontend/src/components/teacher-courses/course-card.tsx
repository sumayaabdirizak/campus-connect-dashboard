'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, BookOpen, Calendar, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TeacherCourseCardData {
  id: string
  courseCode: string
  courseName: string
  department: string
  section: string
  thumbnail: string | null
  totalStudents: number
  totalLessons: number
  schedule?: { day: string; time: string; location: string }
  status: string
}

export function CourseCard({ course }: { course: TeacherCourseCardData }) {
  const cover = course.thumbnail?.trim()
  const initials = (course.courseCode || course.courseName || 'C')
    .slice(0, 2)
    .toUpperCase()
  const isActive = course.status === 'active'

  return (
    <Link href={`/dashboard/courses/${course.id}`} className='group block'>
      <div className='overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border hover:bg-muted'>
        <div className='relative h-40 overflow-hidden bg-primary/10'>
          {cover ? (
            <Image
              src={cover}
              alt={course.courseName}
              fill
              unoptimized
              className='object-cover'
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
          <span
            className={cn(
              'absolute top-3 right-3 rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize',
              isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-white/95 text-muted-foreground'
            )}
          >
            {course.status}
          </span>
        </div>

        <div className='p-4'>
          <h3 className='line-clamp-1 text-sm font-semibold text-foreground'>
            {course.courseName}
          </h3>
          <p className='mt-0.5 truncate text-xs text-muted-foreground'>
            {course.section} · {course.department}
          </p>

          <div className='mt-3 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Users className='size-3' />
              {course.totalStudents}
            </span>
            <span className='flex items-center gap-1'>
              <BookOpen className='size-3' />
              {course.totalLessons}
            </span>
            {course.schedule ? (
              <span className='flex items-center gap-1'>
                <Calendar className='size-3' />
                {course.schedule.day}
              </span>
            ) : null}
            <span className='ml-auto flex items-center gap-0.5 font-semibold text-primary'>
              Open <ArrowUpRight className='size-3.5' />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
