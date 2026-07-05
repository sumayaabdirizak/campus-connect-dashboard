'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import { courseColor } from '../lib/course-color';

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
  const color = courseColor(course.courseCode);
  const coverSrc = resolvePublicAssetUrl(course.thumbnail);
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(coverSrc) && !coverFailed;
  const schedule = course.schedule || [];

  return (
    <Link href={`/dashboard/courses/${course.id}`}>
      <div className='overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md'>
        <div className='relative h-36 w-full overflow-hidden'>
          {showCover ? (
            // Plain img + same-origin /uploads proxy avoids Next image optimizer
            // blocking localhost uploads in dev.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc!}
              alt={course.courseName}
              className='absolute inset-0 h-full w-full object-cover'
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div
              className='flex h-full w-full items-center justify-center'
              style={{ backgroundColor: color }}
            >
              <span className='text-3xl font-bold text-white/90'>
                {(course.courseCode || course.courseName || 'C').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span
            className='absolute left-3 top-3 rounded-md px-2 py-1 text-xs font-semibold text-white shadow-sm'
            style={{ backgroundColor: color }}
          >
            {course.courseCode}
          </span>
        </div>
        <div className='h-1' style={{ backgroundColor: color }} />

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
