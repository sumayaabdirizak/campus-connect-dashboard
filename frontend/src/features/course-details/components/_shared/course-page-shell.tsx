'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CoursePageShellProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Skip outer padding when content manages its own layout */
  flush?: boolean;
}

/**
 * Consistent content wrapper for every course tab — Canvas / Moodle-style
 * white panel on a subtle page background with clear hierarchy.
 */
export function CoursePageShell({
  title,
  description,
  actions,
  children,
  className,
  flush = false
}: CoursePageShellProps) {
  const showHeader = Boolean(title || description || actions);

  return (
    <section
      className={cn(
        'rounded-xl border border-border/60 bg-card shadow-sm',
        !flush && 'overflow-hidden',
        className
      )}
      aria-label={title}
    >
      {showHeader && (
        <header className='flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6'>
          <div className='min-w-0 space-y-1'>
            {title && (
              <h2 className='text-base font-semibold tracking-tight text-foreground sm:text-lg'>
                {title}
              </h2>
            )}
            {description && (
              <p className='text-sm text-muted-foreground'>{description}</p>
            )}
          </div>
          {actions && <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>}
        </header>
      )}
      <div className={cn(flush ? undefined : 'p-4 sm:p-6')}>{children}</div>
    </section>
  );
}
