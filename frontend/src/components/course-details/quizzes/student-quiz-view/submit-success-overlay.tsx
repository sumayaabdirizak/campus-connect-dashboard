'use client';

import { Check } from 'lucide-react';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import {
  earnedMarksFromPercent,
  formatMarksWithPercent,
  quizTotalMarks
} from '../quiz-marks-display';

export function SubmitSuccessOverlay({ attempt }: { attempt: QuizAttempt }) {
  const total = quizTotalMarks(attempt.quiz?.questions);
  const scorePct = attempt.score != null ? Math.round(attempt.score) : null;
  let marksLabel = 'Awaiting grade';
  if (scorePct != null && total > 0) {
    const earned = earnedMarksFromPercent(scorePct, total);
    marksLabel = `Marks: ${formatMarksWithPercent(earned, total, scorePct)}`;
  } else if (scorePct != null) {
    marksLabel = `Marks: ${scorePct}%`;
  }

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
        <p className='text-sm text-muted-foreground'>{marksLabel}</p>
      </div>
    </div>
  );
}
