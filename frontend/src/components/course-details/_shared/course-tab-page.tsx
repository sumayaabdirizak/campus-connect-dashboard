'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Standard outer layout for course tab content pages. */
export function CourseTabPage({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}
