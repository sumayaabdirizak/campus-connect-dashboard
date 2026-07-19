'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, ChevronRight, Layers } from 'lucide-react';
import { CourseHeaderActions } from './course-header-actions';

interface CourseHeaderBannerProps {
  course: { code: string; name: string; department: { name: string }; thumbnail?: string | null };
  section: { name: string };
  batch: { name: string };
  isStudent?: boolean;
  canEditCover: boolean;
  accentColor: string;
  coverUrl: string | null;
  onOpenChat: () => void;
  onOpenCover: () => void;
}

export function CourseHeaderBanner({
  course,
  section,
  batch,
  isStudent,
  canEditCover,
  accentColor,
  coverUrl,
  onOpenChat,
  onOpenCover
}: CourseHeaderBannerProps) {
  return (
    <>
      <div className='relative h-24 sm:h-28 md:h-32'>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt='' className='absolute inset-0 h-full w-full object-cover' />
        ) : (
          <div
            className='absolute inset-0'
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 45%, ${accentColor}88 100%)`
            }}
          />
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent' />

        <div className='relative flex h-full min-w-0 flex-col justify-between p-3 sm:p-4 md:p-5'>
          <div className='flex min-w-0 items-start justify-between gap-2'>
            <Link
              href='/dashboard/courses'
              className='inline-flex shrink-0 items-center gap-1.5 rounded-md bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/40'
            >
              <ArrowLeft className='size-3.5' aria-hidden />
              <span className='sr-only sm:not-sr-only sm:inline'>Courses</span>
            </Link>
            <div className='flex shrink-0 items-center gap-1 sm:gap-1.5'>
              <CourseHeaderActions
                compact={false}
                canEditCover={canEditCover}
                onOpenChat={onOpenChat}
                onOpenCover={onOpenCover}
              />
            </div>
          </div>
        </div>
      </div>

      <div className='min-w-0 px-4 pt-3 sm:px-6 sm:pt-4'>
        <div className='mb-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground'>
          <span className='truncate'>{course.department.name}</span>
          <ChevronRight className='size-3 shrink-0' aria-hidden />
          <span className='inline-flex min-w-0 items-center gap-1 truncate'>
            <Layers className='size-3 shrink-0' aria-hidden />
            <span className='truncate'>
              {batch.name} · {section.name}
            </span>
          </span>
        </div>
        <h1 className='truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-2xl'>
          <span className='text-primary'>{course.code}</span>
          <span className='mx-1.5 text-muted-foreground/60 sm:mx-2'>·</span>
          <span>{course.name}</span>
        </h1>
        <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm'>
          <Building2 className='size-3.5 shrink-0' aria-hidden />
          {isStudent ? 'Student view' : 'Instructor view'}
        </p>
      </div>
    </>
  );
}
