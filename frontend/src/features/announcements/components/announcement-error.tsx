import React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface AnnouncementErrorProps {
  error: Error;
  onRetry: () => void;
}

export function AnnouncementError({ error, onRetry }: AnnouncementErrorProps) {
  return (
    <div className='text-center py-20 bg-destructive/5 border border-destructive/20 rounded-[32px] p-8'>
      <div className='w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4'>
        <Icons.alertCircle className='size-8 text-destructive' />
      </div>
      <h3 className='mb-1 text-lg font-semibold text-foreground'>Failed to load announcements</h3>
      <p className='mx-auto mb-6 max-w-xs text-sm font-medium text-muted-foreground'>
        {error.message || 'Something went wrong while fetching the latest updates.'}
      </p>
      <Button
        onClick={onRetry}
        variant='outline'
        className='rounded-xl border-border font-semibold hover:bg-muted'
      >
        <Icons.refresh className='mr-2 size-4' /> Try again
      </Button>
    </div>
  );
}
