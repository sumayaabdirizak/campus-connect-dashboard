'use client';

import type { ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import { cn } from '@/lib/utils';

type Props = {
  onAdd?: () => void;
  addLabel?: string;
  onRefresh?: () => void;
  children?: ReactNode;
  className?: string;
};

/** Compact action cluster (prefer PosPageHeader for full Units page chrome). */
export function PosPageActions({
  onAdd,
  addLabel = 'Add New',
  onRefresh,
  children,
  className
}: Props) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {onRefresh ? (
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9 rounded-full bg-card shadow-sm'
          onClick={onRefresh}
          aria-label='Refresh'
        >
          <Icons.refresh className='size-4' />
        </Button>
      ) : null}
      {children}
      {onAdd ? (
        <Button type='button' className='h-9 gap-1.5 rounded-full px-4' onClick={onAdd}>
          <Icons.add className='size-4' />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
