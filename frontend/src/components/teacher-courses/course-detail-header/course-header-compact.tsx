'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import { CourseHeaderActions } from './course-header-actions';

interface CourseHeaderCompactProps {
  course: { code: string; name: string; thumbnail?: string | null };
  canEditCover: boolean;
  onExpand?: () => void;
  onOpenChat: () => void;
  onOpenCover: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CourseHeaderCompact({
  course,
  canEditCover,
  onExpand,
  onOpenChat,
  onOpenCover,
  isCollapsed,
  onToggleCollapse,
}: CourseHeaderCompactProps) {
  const resolved = resolvePublicAssetUrl(course.thumbnail ?? null);
  const initials = (course.code || course.name || 'C').slice(0, 2).toUpperCase();

  return (
    <div className='flex min-w-0 items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5'>
      <Link
        href='/dashboard/courses'
        className='inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary'
        aria-label='Back to courses'
      >
        <ArrowLeft className='size-4' aria-hidden />
      </Link>
      <button
        type='button'
        onClick={onExpand}
        className='flex min-w-0 items-center gap-3 text-left'
        title='Show full course header'
      >
        <span className='relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10'>
          {resolved ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolved} alt='' className='h-full w-full object-cover' />
          ) : (
            <span className='text-sm font-bold text-primary'>{initials}</span>
          )}
        </span>
        <span className='min-w-0 truncate text-sm font-semibold transition-colors hover:text-primary'>
          <span className='text-primary'>{course.code}</span>
          <span className='mx-1.5 text-[#D0D5DD]'>·</span>
          <span className='text-foreground'>{course.name}</span>
        </span>
      </button>
      <div className='ml-auto flex shrink-0 items-center gap-2.5'>
        <CourseHeaderActions
          compact
          canEditCover={canEditCover}
          onOpenChat={onOpenChat}
          onOpenCover={onOpenCover}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>
    </div>
  );
}
