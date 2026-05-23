'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface ListSkeletonProps {
  /// Visual shape of each row. "card" = full-bleed bordered block (Feed,
  /// Assignments cards); "row" = single table-row stripe (Roster, sessions).
  variant?: 'card' | 'row';
  /// How many placeholders to render. Defaults to 3 which is enough to
  /// convey "list incoming" without flashing tall blocks for tiny lists.
  count?: number;
}

/// One-stop loading state for tabs. Replaces the various "Loading…" muted-text
/// strings. Matches the height of the real content so the layout doesn't
/// jump when data arrives.
export function ListSkeleton({ variant = 'card', count = 3 }: ListSkeletonProps) {
  if (variant === 'row') {
    return (
      <div className='space-y-2'>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className='flex items-center gap-3 p-3 border rounded-lg'>
            <Skeleton className='h-8 w-8 rounded-full' />
            <div className='flex-1 space-y-1'>
              <Skeleton className='h-3 w-1/3' />
              <Skeleton className='h-3 w-1/2' />
            </div>
            <Skeleton className='h-6 w-16 rounded' />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='border rounded-lg p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-6 w-16 rounded-full' />
          </div>
          <Skeleton className='h-3 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
          <div className='flex gap-2 pt-1'>
            <Skeleton className='h-6 w-16 rounded-full' />
            <Skeleton className='h-6 w-16 rounded-full' />
          </div>
        </div>
      ))}
    </div>
  );
}
