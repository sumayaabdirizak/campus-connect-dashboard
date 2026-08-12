'use client';

import { Check } from 'lucide-react';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';

export function SubmitSuccessOverlay({ attempt }: { attempt: QuizAttempt }) {
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200'
      role='status'
      aria-live='polite'
    >
      <div className='flex flex-col items-center gap-3 animate-in zoom-in-50 fade-in duration-300'>
        <div className='w-16 h-16 rounded-full bg-success-muted flex items-center justify-center ring-4 ring-success/20'>
          <Check className='w-8 h-8 text-success' strokeWidth={3} />
        </div>
        <p className='text-lg font-semibold'>Submitted!</p>
        <p className='text-sm text-muted-foreground'>
          {attempt.score != null ? `Score: ${Math.round(attempt.score)}%` : 'Awaiting grade'}
        </p>
      </div>
    </div>
  );
}
