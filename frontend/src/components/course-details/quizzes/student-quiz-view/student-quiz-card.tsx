'use client';

import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { useCourseLiveNow } from '@/components/course-details/course-live-clock';
import { cn } from '@/lib/utils';
import { QuizCardDetailsPanel } from './quiz-card-details-panel';
import {
  QuizCardFooter,
  QuizCardMetaRow,
  QuizCardTitleRow
} from './quiz-card-summary-row';
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
  useCourseLiveNow();
  const state = resolveStudentQuizCardState(quiz);
  const toggle = () => onExpandedChange(!expanded);

  return (
    <article
      role='button'
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={`quiz-details-${quiz.id}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border bg-card p-5 text-foreground outline-none transition-colors',
        'hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring',
        expanded ? 'max-h-[min(32rem,75vh)]' : null
      )}
    >
      <QuizCardTitleRow quiz={quiz} state={state} expanded={expanded} />

      <div className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain'>
        <QuizCardMetaRow quiz={quiz} state={state} />
        {expanded ? (
          <div
            id={`quiz-details-${quiz.id}`}
            className='border-t border-border/70 pt-4'
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
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
      </div>

      <div className='shrink-0 border-t border-border/60 pt-3'>
        <QuizCardFooter state={state} expanded={expanded} onToggle={toggle} />
      </div>
    </article>
  );
}
