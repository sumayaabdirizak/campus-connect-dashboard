'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pastelFor } from '@/lib/pastel';

export interface TeacherCourseCardData {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  section: string;
  thumbnail: string | null;
  totalStudents: number;
  totalLessons: number;
  schedule?: { day: string; time: string; location: string };
  status: string;
}

interface CourseCardProps {
  course: TeacherCourseCardData;
  index: number;
}

/**
 * Pastel-campus course card: without a cover photo the course renders as a
 * soft pastel tile in its stable hue (same seed → same color everywhere),
 * with oversized initials as the artwork. Hover lifts the card slightly.
 */
export function CourseCard({ course }: CourseCardProps) {
  const cover = course.thumbnail?.trim();
  const initials = (course.courseCode || course.courseName || 'C').slice(0, 2).toUpperCase();
  const hue = pastelFor(course.courseCode || course.courseName || '');

  return (
    <Link href={`/dashboard/courses/${course.id}`} className='group block'>
      <div className='overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md'>
        <div className='relative h-28 overflow-hidden'>
          {cover ? (
            <>
              <Image
                src={cover}
                alt={course.courseName}
                fill
                unoptimized
                className='object-cover transition-transform duration-300 group-hover:scale-[1.03]'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent' />
            </>
          ) : (
            <div className={cn('flex h-full w-full items-center justify-center', hue.tile)}>
              <span className={cn('text-4xl font-bold tracking-tight', hue.text)}>{initials}</span>
            </div>
          )}
          <span
            className={cn(
              'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              course.status === 'active'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {course.status}
          </span>
        </div>

        <div className='p-3.5'>
          <span className={cn('inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold', hue.chip)}>
            {course.courseCode}
          </span>
          <h3 className='mt-1.5 line-clamp-1 text-sm font-semibold'>{course.courseName}</h3>
          <p className='mb-2.5 mt-0.5 text-xs text-muted-foreground'>
            {course.section} · {course.department}
          </p>
          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Users className='size-3' />
              {course.totalStudents}
            </span>
            <span className='flex items-center gap-1'>
              <BookOpen className='size-3' />
              {course.totalLessons}
            </span>
            {course.schedule && (
              <span className='flex items-center gap-1'>
                <Calendar className='size-3' />
                {course.schedule.day}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
