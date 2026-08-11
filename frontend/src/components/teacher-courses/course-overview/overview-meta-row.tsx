'use client';

import { cn } from '@/lib/utils';

export function OverviewMetaRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <p className='text-sm text-[#667085]'>{label}</p>
      <div className={cn('text-sm font-semibold text-[#101828]', valueClassName)}>
        {value}
      </div>
    </div>
  );
}
