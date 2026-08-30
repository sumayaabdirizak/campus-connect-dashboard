'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CourseTabSearch, type CourseTabSearchProps } from './course-tab-search';

interface CourseTabHeaderProps {
  title: string;
  description?: string;
  search?: CourseTabSearchProps;
  actions?: ReactNode;
  className?: string;
}

/** Title left · search + actions right — shared course tab chrome. */
export function CourseTabHeader({
  title,
  description,
  search,
  actions,
  className
}: CourseTabHeaderProps) {
  const hasTrailing = search || actions;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className='min-w-0 flex-1'>
        <h2 className='text-lg font-semibold tracking-tight text-[#101828] dark:text-foreground'>
          {title}
        </h2>
        {description ? (
          <p className='text-sm text-[#667085] dark:text-muted-foreground'>{description}</p>
        ) : null}
      </div>
      {hasTrailing ? (
        <div className='flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto'>
          {search ? <CourseTabSearch {...search} /> : null}
          {actions ? (
            <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
