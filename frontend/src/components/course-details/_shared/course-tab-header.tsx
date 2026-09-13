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

/** Title row · search + actions on a second row — shared course tab chrome. */
export function CourseTabHeader({
  title,
  description,
  search,
  actions,
  className
}: CourseTabHeaderProps) {
  const hasTrailing = search || actions;

  return (
    <div className={cn('space-y-3', className)}>
      <div className='min-w-0'>
        <h2 className='text-lg font-semibold tracking-tight text-[#101828] dark:text-foreground'>
          {title}
        </h2>
        {description ? (
          <p className='text-sm text-[#667085] dark:text-muted-foreground'>{description}</p>
        ) : null}
      </div>
      {hasTrailing ? (
        <div className='flex flex-wrap items-center justify-end gap-2'>
          {search ? (
            <CourseTabSearch
              {...search}
              className={cn('w-full min-w-0 sm:w-auto sm:max-w-xs', search.className)}
            />
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
