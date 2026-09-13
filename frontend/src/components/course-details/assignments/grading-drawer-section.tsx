'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function GradingDrawerSection({
  title,
  hint,
  children,
  className
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card p-4 shadow-xs', className)}>
      <div className='mb-3'>
        <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
        {hint ? <p className='mt-0.5 text-xs text-muted-foreground'>{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
