'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Laundry ChartCard accent — cyan → blue → gold */
const PANEL_ACCENT = 'from-[#13B5C9] via-[#0D76E1] to-[#F9C126]';

export function ReportsPanel({
  title,
  children,
  className,
  action,
  index = 0,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  index?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <header className='relative flex items-center justify-between gap-2 border-b border-[#F2F4F7] px-4 py-3.5'>
        <div
          className={cn('pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r', PANEL_ACCENT)}
          aria-hidden
        />
        <h3 className='text-sm font-semibold tracking-tight text-[#101828]'>{title}</h3>
        {action}
      </header>
      <div className='p-4'>{children}</div>
    </motion.section>
  );
}

export function ReportsDataTable({
  columns,
  rows,
  empty = 'No rows for this report.',
}: {
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
  rows: Record<string, string | number>[];
  empty?: string;
}) {
  const reduce = useReducedMotion();

  if (rows.length === 0) {
    return (
      <div className='flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF]'>
        <p className='text-sm text-[#667085]'>{empty}</p>
      </div>
    );
  }

  return (
    <div className='-mx-4 overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='bg-gradient-to-r from-[#F8FAFC] to-[#F2F4F7]'>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#475467]',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                  (!c.align || c.align === 'left') && 'text-left'
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={i}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
              className='border-t border-[#F2F4F7] transition-colors hover:bg-[#EFF8FF]/70'
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-4 py-3 text-[#344054]',
                    c.align === 'right' && 'text-right font-medium tabular-nums',
                    c.align === 'center' && 'text-center',
                    c.key === columns[0]?.key && 'font-semibold text-[#0D76E1]'
                  )}
                >
                  {row[c.key] ?? '—'}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
