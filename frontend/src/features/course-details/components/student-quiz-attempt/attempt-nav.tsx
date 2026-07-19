'use client';

import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';

export function AttemptNav({
  isLast,
  previewMode,
  warnings,
  maxWarnings,
  submitPending,
  isOffline,
  queuedCount,
  onNext,
  onSubmitClick,
  onClosePreview
}: {
  isLast: boolean;
  previewMode: boolean;
  warnings: number;
  maxWarnings: number;
  submitPending: boolean;
  isOffline: boolean;
  queuedCount: number;
  onNext: () => void;
  onSubmitClick: () => void;
  onClosePreview?: () => void;
}) {
  return (
    <div className='flex items-center justify-between pt-1'>
      <span className='text-sm text-muted-foreground cursor-not-allowed select-none'>
        Previous
      </span>

      {!previewMode && warnings > 0 ? (
        <div
          className='flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-destructive/40 bg-destructive/5 text-destructive tabular-nums'
          aria-live='assertive'
        >
          <ShieldAlert className='w-3 h-3' />
          {warnings}/{maxWarnings} warnings
        </div>
      ) : null}

      {isLast ? (
        <Button
          onClick={() => (previewMode ? onClosePreview?.() : onSubmitClick())}
          disabled={submitPending || isOffline || queuedCount > 0}
          variant={previewMode ? 'outline' : 'default'}
          className='rounded-full px-6'
          title={
            isOffline
              ? 'Waiting for connection — your answers are queued'
              : queuedCount > 0
                ? 'Finishing pending saves before submit'
                : undefined
          }
        >
          {previewMode
            ? 'Close preview'
            : submitPending
              ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin mr-1' />
                    Submitting…
                  </>
                )
              : isOffline
                ? 'Waiting to reconnect…'
                : queuedCount > 0
                  ? 'Syncing…'
                  : 'Submit Quiz'}
        </Button>
      ) : (
        <Button onClick={onNext} className='rounded-full px-6'>
          Next Question
        </Button>
      )}
    </div>
  );
}
