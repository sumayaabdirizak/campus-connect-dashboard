'use client';

import { Icons } from '@/components/icons';
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/features/ui/components/sheet';
import { cn } from '@/lib/utils';

type Props = {
  isEditMode: boolean;
  isDraftEdit: boolean;
  step: 1 | 2 | 3;
  stepLive: string;
  setStep: (n: 1 | 2 | 3) => void;
};

export function DialogProgressHeader({
  isEditMode,
  isDraftEdit,
  step,
  stepLive,
  setStep,
}: Props) {
  const title = isEditMode
    ? isDraftEdit
      ? 'Edit draft'
      : 'Edit announcement'
    : 'New announcement';
  const blurb =
    step === 1
      ? 'Compose the message — text, images, and tone.'
      : step === 2
        ? 'Choose who should see it.'
        : 'Review delivery options and publish.';

  return (
    <SheetHeader className='border-b border-border/60 bg-gradient-to-b from-background to-muted/30 px-6 pb-4 pr-14 pt-6'>
      <div className='min-w-0'>
        <SheetTitle className='text-xl font-semibold tracking-tight'>{title}</SheetTitle>
        <SheetDescription className='sr-only'>
          {stepLive}. Multi-step form to compose and publish a campus announcement.
        </SheetDescription>
        <p className='mt-1 text-sm text-muted-foreground' aria-hidden>
          {blurb}
        </p>
      </div>
      <div aria-live='polite' aria-atomic='true' className='sr-only'>
        {stepLive}
      </div>
      <ol
        aria-label='Progress'
        className='mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'
      >
        {([1, 2, 3] as const).map((n) => {
          const label = n === 1 ? 'Compose' : n === 2 ? 'Audience' : 'Review';
          const completed = step > n;
          const isClickable = n < step;
          return (
            <li key={n} className='flex flex-1 items-center gap-2'>
              <button
                type='button'
                disabled={!isClickable}
                onClick={() => {
                  if (isClickable) setStep(n);
                }}
                aria-current={step === n ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                    step >= n ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {completed ? <Icons.check className='size-3.5' aria-hidden /> : n}
                </span>
                <span className={cn('truncate', step === n && 'text-foreground')}>{label}</span>
              </button>
              {n < 3 ? <span aria-hidden className='h-px flex-1 bg-border' /> : null}
            </li>
          );
        })}
      </ol>
    </SheetHeader>
  );
}
