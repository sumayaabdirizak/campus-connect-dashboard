'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Route-level error boundary for the dashboard. Renders inside the dashboard
 * layout (sidebar + header stay), so a failed feature page degrades gracefully
 * with a retry instead of falling through to the full-page global-error.
 */
export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] route error:', error);
  }, [error]);

  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center'>
      <div className='space-y-1'>
        <h2 className='text-foreground text-lg font-semibold'>Something went wrong</h2>
        <p className='text-muted-foreground max-w-md text-sm'>
          This page failed to load. You can retry, or head back to the dashboard.
        </p>
      </div>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        <Button onClick={reset}>
          <RotateCw className='mr-2 size-4' />
          Try again
        </Button>
        <Button variant='outline' asChild>
          <a href='/dashboard'>Go to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
