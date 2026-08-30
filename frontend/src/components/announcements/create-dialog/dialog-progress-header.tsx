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

const STEP_META = [
  { n: 1 as const, label: 'Compose', short: 'Write message' },
  { n: 2 as const, label: 'Audience', short: 'Choose who sees it' },
  { n: 3 as const, label: 'Review', short: 'Options & post' },
];

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
  const blurb = STEP_META.find((s) => s.n === step)?.short ?? '';

  return (
    <SheetHeader className='shrink-0 border-b-2 border-foreground/10 bg-card px-6 pb-5 pr-14 pt-6 shadow-sm'>
      <div className='min-w-0'>
        <SheetTitle className='text-xl font-bold tracking-tight text-foreground'>{title}</SheetTitle>
        <SheetDescription className='sr-only'>
          {stepLive}. Multi-step form to compose and publish a campus announcement.
        </SheetDescription>
        <p className='mt-1 text-sm font-medium text-foreground/75' aria-hidden>
          {blurb}
        </p>
      </div>
      <div aria-live='polite' aria-atomic='true' className='sr-only'>
        {stepLive}
      </div>
      <ol aria-label='Progress' className='mt-5 flex items-center gap-2'>
        {STEP_META.map(({ n, label }, index) => {
          const completed = step > n;
          const active = step === n;
          const isClickable = n < step;
          return (
            <li key={n} className='flex flex-1 items-center gap-2'>
              <button
                type='button'
                disabled={!isClickable}
                onClick={() => {
                  if (isClickable) setStep(n);
                }}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : completed
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {completed ? <Icons.check className='size-3.5' aria-hidden /> : n}
                </span>
                <span
                  className={cn(
                    'truncate text-sm font-medium',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </button>
              {index < STEP_META.length - 1 ? (
                <span aria-hidden className='h-px min-w-[8px] flex-1 bg-border' />
              ) : null}
            </li>
          );
        })}
      </ol>
    </SheetHeader>
  );
}
