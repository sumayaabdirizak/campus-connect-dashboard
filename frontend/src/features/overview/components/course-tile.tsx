'use client';

import Link from 'next/link';
import { Clock, ArrowUpRight } from 'lucide-react';
import type { StudentCourse } from '@/features/student-courses/api/types';
import { courseColor, courseTint } from '@/features/student-courses/lib/course-color';
import { cn } from '@/lib/utils';

function ProgressRing({
  value,
  color,
  size = 46,
  stroke = 4
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className='relative shrink-0' style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className='-rotate-90'>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          strokeWidth={stroke}
          className='stroke-muted'
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <span className='absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-foreground'>
        {pct}%
      </span>
    </div>
  );
}

/**
 * Color-coded course tile for the student dashboard. Each course carries a
 * stable identity color (accent bar, code chip, progress ring); the surface
 * stays token-driven so it themes + works in dark mode. Renders as a link to
 * the course.
 */
export function CourseTile({ course, className }: { course: StudentCourse; className?: string }) {
  const color = courseColor(course.courseCode);
  const tint = courseTint(course.courseCode);

  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className
      )}
    >
      {/* Course identity accent bar */}
      <span className='h-1.5 w-full shrink-0' style={{ backgroundColor: color }} aria-hidden />

      <div className='flex flex-1 flex-col gap-3 p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <span
              className='inline-block rounded-md px-2 py-0.5 text-xs font-bold tracking-wide'
              style={{ backgroundColor: tint, color }}
            >
              {course.courseCode}
            </span>
            <h4 className='mt-2 line-clamp-2 text-sm font-semibold text-foreground'>
              {course.courseName}
            </h4>
            <p className='mt-0.5 truncate text-xs text-muted-foreground'>
              {course.instructor?.name ?? 'Unassigned'}
            </p>
          </div>
          <ProgressRing value={course.progress ?? 0} color={color} />
        </div>

        <div className='mt-auto flex items-center justify-between gap-2 border-t pt-3'>
          {course.nextClass ? (
            <span className='flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground'>
              <Clock className='size-3.5 shrink-0' />
              <span className='truncate'>
                {course.nextClass.time} · {course.nextClass.location}
              </span>
            </span>
          ) : (
            <span className='text-xs text-muted-foreground'>No upcoming class</span>
          )}
          <ArrowUpRight className='size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground' />
        </div>
      </div>
    </Link>
  );
}
