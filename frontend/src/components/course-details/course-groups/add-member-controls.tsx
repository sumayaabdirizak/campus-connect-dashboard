'use client';

import { UserPlus } from 'lucide-react';
import { Button } from '@/features/ui/components/button';

export function AddMemberControls({
  onStart,
  disabled,
  availableCount
}: {
  onStart: () => void;
  disabled: boolean;
  availableCount: number;
}) {
  return (
    <div className='mt-3'>
      <Button
        variant='outline'
        size='sm'
        className='h-10 w-full gap-1.5 border-2 border-border text-sm font-semibold hover:border-primary/40 hover:bg-primary/5'
        onClick={onStart}
        disabled={disabled}
        title={
          disabled
            ? 'Every student is already in a group'
            : `${availableCount} student${availableCount === 1 ? '' : 's'} available`
        }
      >
        <UserPlus className='size-4' />
        Add students
        {availableCount > 0 ? (
          <span className='font-medium text-muted-foreground'>({availableCount})</span>
        ) : null}
      </Button>
    </div>
  );
}
