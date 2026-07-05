'use client';

import Link from 'next/link';
import type { StudentCourse } from '@/features/student-courses/api/types';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import { courseColor } from '@/features/student-courses/lib/course-color';

/**
 * Moodle-style "course overview" card: a colored header banner, course
 * meta, and a progress bar pinned along the bottom edge. Utilitarian /
 * Bootstrap-ish (subtle border, modest radius) to match the Moodle look.
 */
export function MoodleCourseCard({ course }: { course: StudentCourse }) {
  const color = courseColor(course.courseCode);
  const progress = course.progress || 0;
  const coverSrc = resolvePublicAssetUrl(course.thumbnail);

  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      className='group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
    >
      {/* Banner — course thumbnail when available, else the identity color */}
      <div
        className='relative h-16 w-full bg-cover bg-center'
        style={{
          backgroundColor: color,
          backgroundImage: coverSrc ? `url("${coverSrc}")` : undefined
        }}
      >
        {coverSrc && (
          <span
            className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent'
            aria-hidden
          />
        )}
        <span className='absolute bottom-2 left-3 text-xs font-semibold tracking-wide text-white drop-shadow-sm'>
          {course.courseCode}
        </span>
      </div>

      {/* Body */}
      <div className='flex flex-1 flex-col p-3'>
        <p className='text-[11px] uppercase tracking-wide text-muted-foreground'>
          {course.department || 'Course'}
        </p>
        <h4 className='line-clamp-2 text-sm font-semibold text-primary group-hover:underline'>
          {course.courseName}
        </h4>
        <p className='mt-1 truncate text-xs text-muted-foreground'>
          {course.instructor || 'Unassigned'}
        </p>
      </div>

      {/* Progress (bottom edge) */}
      <div className='px-3 pb-3'>
        <div className='mb-1 flex items-center justify-between text-[11px] text-muted-foreground'>
          <span>{progress}% complete</span>
          <span>
            {course.totalLessons > 0
              ? `${course.completedLessons}/${course.totalLessons}`
              : 'No items yet'}
          </span>
        </div>
        <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
          <div
            className='h-full rounded-full'
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </Link>
  );
}
