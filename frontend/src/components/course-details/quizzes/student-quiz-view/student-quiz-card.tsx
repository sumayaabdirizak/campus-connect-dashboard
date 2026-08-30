'use client';

import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { QuizCardDetailsPanel } from './quiz-card-details-panel';
import { QuizCardSummaryRow } from './quiz-card-summary-row';
import { resolveStudentQuizCardState } from './student-quiz-card-state';

export function StudentQuizCard({
  quiz,
  expanded,
  onExpandedChange,
  reviewLoadingId,
  startPending,
  onOpenResults,
  onStart
}: {
  quiz: Quiz;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  reviewLoadingId: number | null;
  startPending: boolean;
  onOpenResults: (attemptId: number) => void;
  onStart: () => void;
}) {
  const state = resolveStudentQuizCardState(quiz);

  return (
    <article className='min-w-0 rounded-xl border bg-card p-5 text-foreground'>
      <QuizCardSummaryRow
        quiz={quiz}
        state={state}
        expanded={expanded}
        onToggle={() => onExpandedChange(!expanded)}
      />

      {expanded ? (
        <div
          id={`quiz-details-${quiz.id}`}
          className='mt-4 border-t border-border/70 pt-4'
        >
          <QuizCardDetailsPanel
            quiz={quiz}
            state={state}
            reviewLoadingId={reviewLoadingId}
            startPending={startPending}
            onOpenResults={onOpenResults}
            onStart={onStart}
          />
        </div>
      ) : null}
    </article>
  );
}
