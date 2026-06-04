'use client';

import Link from 'next/link';
import { Users, Clock } from 'lucide-react';
import type { Course } from '@/features/teacher-courses/api/types';
import { courseColor } from '@/features/student-courses/lib/course-color';

/**
 * Moodle-style course card for the teacher dashboard. Same look as the student
 * card (thumbnail/identity banner + meta) but the footer shows teaching context
 * — enrolled student count and the class schedule — instead of personal
 * progress.
 */
export function TeacherCourseTile({ course }: { course: Course }) {
  const color = courseColor(course.courseCode);
  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      className='group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
    >
      <div
        className='relative h-16 w-full bg-cover bg-center'
        style={{
          backgroundColor: color,
          backgroundImage: course.thumbnail ? `url("${course.thumbnail}")` : undefined
        }}
      >
        {course.thumbnail && (
          <span className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent' aria-hidden />
        )}
        <span className='absolute bottom-2 left-3 text-xs font-semibold tracking-wide text-white drop-shadow-sm'>
          {course.courseCode}
        </span>
      </div>

      <div className='flex flex-1 flex-col p-3'>
        <p className='text-[11px] uppercase tracking-wide text-muted-foreground'>
          {course.department || 'Course'}
          {course.section ? ` · ${course.section}` : ''}
        </p>
        <h4 className='line-clamp-2 text-sm font-semibold text-primary group-hover:underline'>
          {course.courseName}
        </h4>
      </div>

      <div className='flex items-center justify-between gap-2 border-t px-3 py-2.5 text-xs text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <Users className='size-3.5' />
          {course.totalStudents} students
        </span>
        {course.schedule && (
          <span className='flex min-w-0 items-center gap-1.5'>
            <Clock className='size-3.5 shrink-0' />
            <span className='truncate'>
              {course.schedule.day} {course.schedule.time}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
