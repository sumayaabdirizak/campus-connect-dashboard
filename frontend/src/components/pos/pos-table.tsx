import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { posTableColors as c } from './pos-colors';

/** Table primitives — shared Batches/Sections palette. */
export function PosTable({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <table
      className={cn(
        // w-max: grow to column content so overflow-x-auto on the card can scroll
        'mb-0 w-max min-w-full border-collapse text-sm [font-family:var(--font-sans)]',
        className
      )}
    >
      {children}
    </table>
  );
}

export function PosTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className='border-b' style={{ borderColor: c.border, backgroundColor: c.headerBg }}>
      {children}
    </thead>
  );
}

export function PosTableHeaderCell({
  children,
  className,
  align = 'left'
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase sm:px-4 sm:py-3',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className
      )}
      style={{ color: c.muted }}
    >
      {children}
    </th>
  );
}

export function PosTableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className='divide-y' style={{ borderColor: c.rowBorder }}>
      {children}
    </tbody>
  );
}

export function PosTableRow({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn('bg-white transition-colors hover:bg-[#F9FAFB]', className)}
    >
      {children}
    </tr>
  );
}

export function PosTableCell({
  children,
  className,
  align = 'left'
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={cn(
        'px-3 py-3 align-middle text-sm whitespace-nowrap sm:px-4 sm:py-3.5',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
      style={{ color: c.heading }}
    >
      {children}
    </td>
  );
}
