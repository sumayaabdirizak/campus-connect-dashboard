'use client';

import { Button } from '@/features/ui/components/button';
import { SheetFooter } from '@/features/ui/components/sheet';
import { Icons } from '@/components/icons';
import { htmlToPlain } from './utils';

type Props = {
  step: 1 | 2 | 3;
  content: string;
  isSubmitting: boolean;
  isEditMode: boolean;
  onCancelOrBack: () => void;
  onContinue: () => void;
  onSubmit: () => void;
};

export function DialogStepFooter({
  step,
  content,
  isSubmitting,
  isEditMode,
  onCancelOrBack,
  onContinue,
  onSubmit,
}: Props) {
  return (
    <SheetFooter className='mt-auto shrink-0 gap-3 border-t-2 border-foreground/10 bg-card px-6 pb-6 pt-4 shadow-[0_-6px_16px_rgba(16,24,40,0.08)]'>
      <Button
        variant='outline'
        onClick={onCancelOrBack}
        className='h-11 min-h-[44px] flex-1 rounded-xl border-2 border-foreground/15 font-semibold text-foreground'
      >
        {step === 1 ? 'Cancel' : 'Back'}
      </Button>
      {step < 3 ? (
        <Button onClick={onContinue} className='h-11 min-h-[44px] flex-1 rounded-xl font-semibold'>
          Continue
          <Icons.chevronRight className='ms-1 size-4' aria-hidden />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !htmlToPlain(content)}
          className='h-11 min-h-[44px] flex-1 rounded-xl font-semibold'
        >
          {isSubmitting ? (
            <>
              <Icons.spinner className='me-2 size-4 animate-spin' aria-hidden />
              Posting…
            </>
          ) : isEditMode ? (
            'Save changes'
          ) : (
            'Post announcement'
          )}
        </Button>
      )}
    </SheetFooter>
  );
}
