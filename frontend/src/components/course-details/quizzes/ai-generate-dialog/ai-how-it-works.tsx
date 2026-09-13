'use client';

import { Info } from 'lucide-react';

export function AiHowItWorks({ isNewQuiz }: { isNewQuiz: boolean }) {
  return (
    <div className='flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-xs text-muted-foreground'>
      <Info className='w-3.5 h-3.5 shrink-0 mt-0.5 text-primary' />
      {isNewQuiz ? (
        <p>You&apos;ll review and pick which questions to keep before anything is saved.</p>
      ) : (
        <p>You&apos;ll review and pick which questions to keep before they&apos;re added.</p>
      )}
    </div>
  );
}
