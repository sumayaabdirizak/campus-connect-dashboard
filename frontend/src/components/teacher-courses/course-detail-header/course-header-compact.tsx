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
    <div className='flex min-w-0 items-center gap-3 border-b border-[#E5E7EB] px-3 py-2.5 sm:px-4'>
      <Link
        href='/dashboard/courses'
        className='inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-[#F8FAFC] hover:text-[#3B82F6]'
        aria-label='Back to courses'
      >
        <ArrowLeft className='size-4' aria-hidden />
      </Link>
      <button
        type='button'
        onClick={onExpand}
        className='flex min-w-0 items-center gap-2.5 text-left'
        title='Show full course header'
      >
        <span className='relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#EFF6FF]'>
          {resolved ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolved} alt='' className='h-full w-full object-cover' />
          ) : (
            <span className='text-sm font-bold text-[#3B82F6]'>{initials}</span>
          )}
        </span>
        <span className='min-w-0 truncate text-sm font-semibold transition-colors hover:text-[#3B82F6]'>
          <span className='text-[#3B82F6]'>{course.code}</span>
          <span className='mx-1.5 text-[#D0D5DD]'>·</span>
          <span className='text-[#101828]'>{course.name}</span>
        </span>
      </button>
      <div className='ml-auto flex shrink-0 items-center gap-0.5'>
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
