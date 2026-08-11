'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import { CourseHeaderActions } from './course-header-actions';

interface CourseHeaderBannerProps {
  course: {
    code: string;
    name: string;
    department: { name: string };
    thumbnail?: string | null;
  };
  section: { name: string };
  batch: { name: string };
  isStudent?: boolean;
  canEditCover: boolean;
  coverUrl: string | null;
  onOpenChat: () => void;
  onOpenCover: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CourseHeaderBanner({
  course,
  section,
  batch,
  isStudent,
  canEditCover,
  coverUrl,
  onOpenChat,
  onOpenCover,
  isCollapsed,
  onToggleCollapse,
}: CourseHeaderBannerProps) {
  const resolved = resolvePublicAssetUrl(coverUrl);
  const initials = (course.code || course.name || 'C').slice(0, 2).toUpperCase();

  return (
    <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5'>
      <div className='relative h-36 w-full shrink-0 overflow-hidden rounded-lg bg-[#EFF6FF] sm:h-auto sm:w-44 md:w-52'>
        {resolved ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolved}
            alt=''
            className='absolute inset-0 h-full w-full object-cover'
          />
        ) : (
          <div className='flex h-full min-h-36 w-full items-center justify-center sm:min-h-0'>
            <span className='text-3xl font-bold tracking-tight text-[#3B82F6]'>
              {initials}
            </span>
          </div>
        )}
        <span className='absolute top-3 left-3 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-[#101828] shadow-sm'>
          {course.code}
        </span>
      </div>

      <div className='flex min-w-0 flex-1 flex-col justify-between gap-3'>
        <div className='flex min-w-0 items-start justify-between gap-3'>
          <Link
            href='/dashboard/courses'
            className='inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#667085] transition-colors hover:text-[#3B82F6]'
          >
            <ArrowLeft className='size-3.5' aria-hidden />
            My Courses
          </Link>
          <div className='flex shrink-0 items-center gap-1'>
            <CourseHeaderActions
              compact={false}
              canEditCover={canEditCover}
              onOpenChat={onOpenChat}
              onOpenCover={onOpenCover}
              isCollapsed={isCollapsed}
              onToggleCollapse={onToggleCollapse}
            />
          </div>
        </div>

        <div className='min-w-0'>
          <h1 className='truncate text-2xl font-bold tracking-tight text-black sm:text-3xl'>
            {course.name}
          </h1>
          <p className='mt-1 truncate text-base text-[#1D2939]'>
            {course.department.name}
            <span className='mx-1.5 text-[#98A2B3]' aria-hidden>
              ·
            </span>
            {batch.name} · {section.name}
          </p>
          <p className='mt-2 text-sm font-semibold text-[#3B82F6]'>
            {isStudent ? 'Student view' : 'Instructor view'}
          </p>
        </div>
      </div>
    </div>
  );
}
