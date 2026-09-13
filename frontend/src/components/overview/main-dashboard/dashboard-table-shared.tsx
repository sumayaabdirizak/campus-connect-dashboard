'use client';

import { Skeleton } from '@/features/ui/components/skeleton';
import { cn } from '@/lib/utils';

export function userInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function roleBadgeVariant(role: string) {
  switch (role?.toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'destructive';
    case 'DEAN':
      return 'default';
    case 'TEACHER':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function TableSkeleton({ rows }: { rows: number; cols?: number }) {
  return (
    <div className='space-y-2'>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-11 w-full rounded-lg' />
      ))}
    </div>
  );
}

export function TableEmpty({ message }: { message: string }) {
  return (
    <div className={cn('rounded-xl border border-dashed py-10 text-center')}>
      <p className='text-muted-foreground text-sm'>{message}</p>
    </div>
  );
}
