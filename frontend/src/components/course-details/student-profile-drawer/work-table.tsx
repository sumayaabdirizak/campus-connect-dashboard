'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function WorkTable({
  headers,
  children,
  className
}: {
  headers: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border/80', className)}>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border/60 bg-muted/30'>
            {headers.map((h) => (
              <th
                key={h}
                className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-muted-foreground'
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-border/60'>{children}</tbody>
      </table>
    </div>
  );
}

export function WorkTableRow({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn('bg-card', className)}>{children}</tr>;
}

export function WorkTableCell({
  children,
  className,
  align = 'left'
}: {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-middle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  );
}
