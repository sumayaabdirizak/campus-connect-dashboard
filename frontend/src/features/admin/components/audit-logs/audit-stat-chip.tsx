'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function StatChip({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <span className='text-muted-foreground whitespace-nowrap text-xs sm:text-sm'>
      {loading ? (
        <Skeleton className='inline-block h-4 w-10 align-middle' />
      ) : (
        <strong className='text-foreground mr-1 font-semibold tabular-nums'>
          {value.toLocaleString()}
        </strong>
      )}
      {label}
    </span>
  );
}
