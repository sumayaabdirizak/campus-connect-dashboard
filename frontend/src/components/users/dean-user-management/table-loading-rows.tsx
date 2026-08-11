'use client';

import { Skeleton } from '@/features/ui/components/skeleton';
import { TableCell, TableRow } from '@/features/ui/components/table';

export function TableLoadingRows({
  rows = 4,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className='h-4 w-full max-w-[120px]' />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
