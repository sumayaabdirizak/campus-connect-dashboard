'use client';

import { Button } from '@/components/ui/button';
import { Eye, Loader2, PlayCircle } from 'lucide-react';
import type { Quiz } from '../../api/quizzes-types';
import { StudentQuizCardMeta } from './student-quiz-card-meta';

export function StudentQuizCard({
  quiz: q,
  reviewLoadingId,
  startPending,
  onOpenResults,
  onStart,
}: {
  quiz: Quiz;
  reviewLoadingId: number | null;
  startPending: boolean;
  onOpenResults: (attemptId: number) => void;
  onStart: () => void;
}) {
  const inProgress = q.inProgressAttempt ?? null;
  const attemptsUsed = q.attemptsUsed ?? 0;
  const attemptsLeft = q.attemptsLeft ?? Math.max(0, q.max_attempts - attemptsUsed);
  const exhausted = !inProgress && attemptsLeft <= 0;
  const last = q.lastAttempt ?? null;

  return (
    <div className='group border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors hover:bg-muted/30'>
      <StudentQuizCardMeta quiz={q} />
      <div className='flex items-center gap-2 shrink-0 self-stretch sm:self-auto'>
        {last ? (
          <Button
            size='sm'
            variant={exhausted && !inProgress ? 'default' : 'outline'}
            className='gap-1'
            onClick={() => onOpenResults(last.id)}
            disabled={reviewLoadingId === last.id}
            aria-label={`View your results for ${q.title}`}
          >
            {reviewLoadingId === last.id ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Eye className='w-4 h-4' />
            )}
            Results
          </Button>
        ) : null}
        {!(exhausted && last && !inProgress) ? (
          <Button
            size='sm'
            className={`transition-transform group-hover:translate-x-0.5 ${
              inProgress ? 'gap-1' : ''
            }`}
            onClick={onStart}
            disabled={startPending || (q.questions?.length ?? 0) === 0 || exhausted}
            aria-label={
              inProgress
                ? `Continue attempt for ${q.title}`
                : exhausted
                  ? `No attempts left for ${q.title}`
                  : `Start ${q.title}`
            }
          >
            {(q.questions?.length ?? 0) === 0 ? (
              'Empty quiz'
            ) : inProgress ? (
              <>
                <PlayCircle className='w-4 h-4' />
                Continue
              </>
            ) : exhausted ? (
              'No attempts left'
            ) : attemptsUsed > 0 ? (
              'Retry'
            ) : (
              'Start'
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
