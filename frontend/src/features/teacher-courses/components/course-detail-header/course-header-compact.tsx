'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CourseHeaderActions } from './course-header-actions';

interface CourseHeaderCompactProps {
  course: { code: string; name: string };
  canEditCover: boolean;
  onExpand?: () => void;
  onOpenChat: () => void;
  onOpenCover: () => void;
}

export function CourseHeaderCompact({
  course,
  canEditCover,
  onExpand,
  onOpenChat,
  onOpenCover
}: CourseHeaderCompactProps) {
  return (
    <div className='flex min-w-0 items-center gap-2 border-b border-border/60 px-3 py-2 sm:px-4'>
      <Link
        href='/dashboard/courses'
        className='inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        aria-label='Back to courses'
      >
        <ArrowLeft className='size-4' aria-hidden />
      </Link>
      <button
        type='button'
        onClick={onExpand}
        className='min-w-0 truncate text-left text-sm font-semibold transition-colors hover:text-primary'
        title='Show full course header'
      >
        <span className='text-primary'>{course.code}</span>
        <span className='mx-1.5 text-muted-foreground/60'>·</span>
        <span className='text-foreground'>{course.name}</span>
      </button>
      <div className='ml-auto flex shrink-0 items-center gap-0.5'>
        <CourseHeaderActions
          compact
          canEditCover={canEditCover}
          onOpenChat={onOpenChat}
          onOpenCover={onOpenCover}
        />
      </div>
    </div>
  );
}
