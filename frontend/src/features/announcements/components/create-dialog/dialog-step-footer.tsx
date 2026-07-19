'use client';

import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { htmlToPlain } from './utils';

type Props = {
  step: 1 | 2 | 3;
  title: string;
  content: string;
  isSubmitting: boolean;
  isEditMode: boolean;
  onCancelOrBack: () => void;
  onContinue: () => void;
  onSubmit: () => void;
};

export function DialogStepFooter({
  step,
  title,
  content,
  isSubmitting,
  isEditMode,
  onCancelOrBack,
  onContinue,
  onSubmit,
}: Props) {
  return (
    <SheetFooter className='mt-auto gap-2 border-t border-border bg-background/95 px-6 pb-6 pt-4 backdrop-blur-md'>
      <Button
        variant='outline'
        onClick={onCancelOrBack}
        className='h-11 min-h-[44px] flex-1 rounded-xl'
      >
        {step === 1 ? 'Cancel' : 'Back'}
      </Button>
      {step < 3 ? (
        <Button onClick={onContinue} className='h-11 min-h-[44px] flex-1 rounded-xl'>
          Continue
          <Icons.chevronRight className='ms-1 size-4' aria-hidden />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !title.trim() || !htmlToPlain(content)}
          className='h-11 min-h-[44px] flex-1 rounded-xl'
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
