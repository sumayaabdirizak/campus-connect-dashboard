'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export function AttemptNav({
  isFirst,
  isLast,
  previewMode,
  warnings,
  maxWarnings,
  submitPending,
  isOffline,
  queuedCount,
  onPrev,
  onNext,
  onSubmitClick,
  onClosePreview
}: {
  isFirst: boolean;
  isLast: boolean;
  previewMode: boolean;
  warnings: number;
  maxWarnings: number;
  submitPending: boolean;
  isOffline: boolean;
  queuedCount: number;
  onPrev: () => void;
  onNext: () => void;
  onSubmitClick: () => void;
  onClosePreview?: () => void;
}) {
  const submitBusy = submitPending || isOffline || queuedCount > 0;

  return (
    <div className='flex items-center justify-between gap-3 pt-1'>
      <Button
        type='button'
        variant='outline'
        className='h-12 min-w-[7rem] rounded-xl px-5 text-base'
        onClick={onPrev}
        disabled={isFirst}
      >
        <ArrowLeft className='size-4' />
        Back
      </Button>

      {!previewMode && warnings > 0 ? (
        <p className='text-center text-sm text-destructive'>
          {warnings} of {maxWarnings} warnings
        </p>
      ) : (
        <span />
      )}

      {isLast ? (
        <Button
          onClick={() => (previewMode ? onClosePreview?.() : onSubmitClick())}
          disabled={!previewMode && submitBusy}
          variant={previewMode ? 'outline' : 'default'}
          className='h-12 min-w-[8.5rem] rounded-xl bg-blue-600 px-6 text-base text-white hover:bg-blue-700'
        >
          {previewMode ? (
            'Close preview'
          ) : submitPending ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              Sending…
            </>
          ) : isOffline ? (
            'Waiting…'
          ) : queuedCount > 0 ? (
            'Saving…'
          ) : (
            'Finish quiz'
          )}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          className='h-12 min-w-[7rem] rounded-xl bg-blue-600 px-5 text-base text-white hover:bg-blue-700'
        >
          Next
          <ArrowRight className='size-4' />
        </Button>
      )}
    </div>
  );
}
