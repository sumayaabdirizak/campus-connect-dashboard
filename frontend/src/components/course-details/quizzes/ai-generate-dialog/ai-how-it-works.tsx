'use client';

import { Info } from 'lucide-react';

export function AiHowItWorks({ isNewQuiz }: { isNewQuiz: boolean }) {
  return (
    <div className='flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground'>
      <Info className='w-3.5 h-3.5 shrink-0 mt-0.5' />
      {isNewQuiz ? (
        <p>
          Nothing is saved yet — you&apos;ll review every question and choose what to keep
          first. The rest become a new <strong className='text-foreground'>draft quiz</strong>.
        </p>
      ) : (
        <p>
          Nothing is saved yet — you&apos;ll review every question and choose what to keep
          first. The rest are added straight to this quiz.
        </p>
      )}
    </div>
  );
}
