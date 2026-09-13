'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye, Loader2, Play } from 'lucide-react';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import type { StudentQuizCardState } from './student-quiz-card-state';

export function QuizCardDetailsPanel({
  quiz,
  state,
  reviewLoadingId,
  startPending,
  onOpenResults,
  onStart
}: {
  quiz: Quiz;
  state: StudentQuizCardState;
  reviewLoadingId: number | null;
  startPending: boolean;
  onOpenResults: (attemptId: number) => void;
  onStart: () => void;
}) {
  const lastId = state.lastAttemptId;
  const reviewing = lastId != null && reviewLoadingId === lastId;

  const showStart =
    !state.isOffline &&
    (state.inProgress ||
      (!state.exhausted &&
        (state.status.key === 'open' ||
          state.status.key === 'not_submitted' ||
          state.status.key === 'closes_soon' ||
          state.status.key === 'opens_soon' ||
          state.status.key === 'not_ready')));

  const startLabel = state.inProgress
    ? 'Continue'
    : state.status.key === 'opens_soon'
      ? 'Not open yet'
      : state.status.key === 'not_ready'
        ? 'Not ready yet'
        : (quiz.attemptsUsed ?? 0) > 0
          ? 'Try again'
          : 'Start quiz';

  const showResults =
    lastId != null &&
    (state.hasResults ||
      state.status.key === 'submitted' ||
      state.status.key === 'graded_pass' ||
      state.status.key === 'graded_fail' ||
      state.status.key === 'printed_absent' ||
      (!state.isOffline && !state.inProgress));

  return (
    <div className='space-y-4' onClick={(e) => e.stopPropagation()}>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge
          size='sm'
          className={
            state.isOffline
              ? 'shrink-0 rounded-full border-transparent bg-secondary text-secondary-foreground'
              : 'shrink-0 rounded-full border-transparent bg-info text-info-foreground'
          }
        >
          {state.isOffline ? 'Printed' : 'Online'}
        </Badge>
        {quiz.timing_mode === 'fixed' && !state.isOffline ? (
          <Badge size='sm' variant='outline' className='rounded-full'>
            Shared timer
          </Badge>
        ) : null}
        {(quiz.attemptsUsed ?? 0) > 0 ? (
          <span className='text-xs text-muted-foreground'>
            Attempt {quiz.attemptsUsed}
            {quiz.max_attempts ? ` of ${quiz.max_attempts}` : ''}
          </span>
        ) : null}
      </div>

      {state.scheduleLine ? (
        <p className='text-sm text-muted-foreground'>{state.scheduleLine}</p>
      ) : null}

      {state.isOffline ? (
        state.status.key === 'graded_pass' || state.status.key === 'graded_fail' ? (
          <Button
            className='w-full rounded-full sm:w-auto'
            variant='outline'
            onClick={() => onOpenResults(lastId!)}
            disabled={reviewing}
          >
            {reviewing ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Eye className='size-4' />
            )}
            See results
          </Button>
        ) : state.status.key === 'printed_absent' ? (
          <p className='text-sm text-muted-foreground'>Marked absent for this quiz.</p>
        ) : state.status.key === 'printed_cheat' ? (
          <p className='text-sm text-muted-foreground'>
            Marked for cheating — 0 marks recorded.
          </p>
        ) : (
          <p className='text-sm text-muted-foreground'>
            Printed quiz — your marks will appear here once your teacher records them.
          </p>
        )
      ) : (
        <div className='flex flex-wrap gap-2'>
          {showStart ? (
            <Button
              className={cn(
                'rounded-full',
                state.canStart
                  ? ''
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              )}
              onClick={onStart}
              disabled={startPending || !state.canStart}
            >
              {startPending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Play className='size-4 fill-current' />
              )}
              {startLabel}
            </Button>
          ) : null}

          {state.status.key === 'missed' || state.status.key === 'closed' ? (
            !showResults ? (
              <p className='text-sm text-muted-foreground'>
                {state.status.key === 'missed'
                  ? 'This quiz closed without a submission.'
                  : 'This quiz is closed.'}
              </p>
            ) : null
          ) : null}

          {showResults && lastId != null ? (
            <Button
              variant='outline'
              className='rounded-full'
              onClick={() => onOpenResults(lastId)}
              disabled={reviewing}
            >
              {reviewing ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Eye className='size-4' />
              )}
              See results
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
