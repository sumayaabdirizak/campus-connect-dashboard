'use client';

import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { useCourseLiveNow } from '@/components/course-details/course-live-clock';
import { cn } from '@/lib/utils';
import { QuizCardDetailsPanel } from './quiz-card-details-panel';
import {
  QuizCardBody,
  QuizCardFooter,
  QuizCardHeader
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
        'flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-foreground outline-none transition-colors',
        'hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring',
        expanded ? 'max-h-[min(32rem,75vh)]' : null
      )}
    >
      <div className='shrink-0 border-b border-border/60 bg-card px-5 pt-5 pb-3'>
        <QuizCardHeader quiz={quiz} state={state} />
      </div>

      <div className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-3'>
        <QuizCardBody quiz={quiz} expanded={expanded} />
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

      <div className='shrink-0 border-t border-border/60 bg-card px-5 pt-3 pb-5'>
        <QuizCardFooter state={state} expanded={expanded} onToggle={toggle} />
      </div>
    </article>
  );
}
