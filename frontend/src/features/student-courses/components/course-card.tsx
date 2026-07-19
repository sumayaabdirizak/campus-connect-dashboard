'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import { pastelFor } from '@/lib/pastel';

export interface StudentCourseCardData {
  id: number | string;
  courseCode: string;
  courseName: string;
  instructor: string;
  progress: number;
  thumbnail: string | null;
  schedule?: { day: number; time: string }[];
}

interface StudentCourseCardProps {
  course: StudentCourseCardData;
  index: number;
}

const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StudentCourseCard({ course }: StudentCourseCardProps) {
  const hue = pastelFor(course.courseCode || course.courseName || '');
  const coverSrc = resolvePublicAssetUrl(course.thumbnail);
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(coverSrc) && !coverFailed;
  const schedule = course.schedule || [];

  return (
    <Link href={`/dashboard/courses/${course.id}`} className='group block'>
      <div className='overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md'>
        <div className='relative h-36 w-full overflow-hidden'>
          {showCover ? (
            // Plain img + same-origin /uploads proxy avoids Next image optimizer
            // blocking localhost uploads in dev.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc!}
              alt={course.courseName}
              className='absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className={cn('flex h-full w-full items-center justify-center', hue.tile)}>
              <span className={cn('text-4xl font-bold tracking-tight', hue.text)}>
                {(course.courseCode || course.courseName || 'C').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span
            className={cn(
              'absolute left-3 top-3 rounded-full px-2 py-1 text-xs font-semibold shadow-sm',
              showCover ? 'bg-white/90 text-foreground dark:bg-black/60 dark:text-white' : hue.chip
            )}
          >
            {course.courseCode}
          </span>
        </div>

        <div className='p-4'>
          <h3 className='line-clamp-1 text-base font-semibold text-foreground'>
            {course.courseName}
          </h3>
          <p className='mt-0.5 text-sm text-muted-foreground'>{course.instructor}</p>

          <div className='mt-3 space-y-1.5'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>Progress</span>
              <span className='font-medium text-foreground'>{course.progress}%</span>
            </div>
            <Progress value={course.progress} className='h-1.5 bg-muted' />
          </div>

          {schedule.length > 0 && (
            <div className='mt-3 flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Clock className='size-3.5' />
              <span>
                {schedule.map((s) => dayAbbr[s.day]).join(' / ')} - {schedule[0].time}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
