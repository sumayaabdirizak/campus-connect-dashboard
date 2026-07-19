import { Badge } from '@/components/ui/badge';
import { Award, Clock3, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import type { QuizAttempt } from '../../api/quizzes-types';
import {
  computeAttemptStats,
  formatElapsedLabel,
  getClosureBadge,
  getClosureCallout
} from './helpers';

interface AttemptReviewBannerProps {
  attempt: QuizAttempt;
}

export function AttemptReviewBanner({ attempt }: AttemptReviewBannerProps) {
  const quiz = attempt.quiz;
  const { totalPoints, earnedPoints, score, passingScore, passed } =
    computeAttemptStats(attempt);
  const closureReason = attempt.closure_reason ?? null;
  const violationsCount = attempt.violations_count ?? 0;
  const closureBadge = getClosureBadge(closureReason);
  const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
  const elapsedLabel = formatElapsedLabel(
    attempt.started_at ?? null,
    attempt.submitted_at ?? null
  );
  const closureCallout = getClosureCallout(closureReason);

  return (
    <>
      <div
        className={`border rounded-xl p-5 flex items-center justify-between gap-4 ${
          passed ? 'border-success bg-success-muted' : 'border-destructive/40 bg-destructive/5'
        }`}
      >
        <div className='space-y-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h2 className='text-lg font-bold truncate'>{quiz?.title ?? 'Quiz'}</h2>
            <Badge variant={passed ? 'default' : 'destructive'} className='gap-1'>
              <Award className='w-3 h-3' />
              {passed ? 'Passed' : 'Did not pass'}
            </Badge>
            {closureBadge && <Badge variant={closureBadge.tone}>{closureBadge.label}</Badge>}
          </div>
          <p className='text-xs text-muted-foreground'>
            {earnedPoints.toFixed(1)} / {totalPoints.toFixed(1)} points · passing mark{' '}
            {passingScore}%
            {submittedAt && (
              <span> · submitted {format(submittedAt, 'MMM d, h:mm a')}</span>
            )}
            {elapsedLabel && (
              <span className='inline-flex items-center gap-0.5 ml-1'>
                <Clock3 className='w-3 h-3' /> {elapsedLabel}
              </span>
            )}
            {violationsCount > 0 && (
              <span
                className='inline-flex items-center gap-0.5 ml-1 text-destructive'
                title={`${violationsCount} monitoring event${violationsCount === 1 ? '' : 's'} during this attempt`}
              >
                · <ShieldAlert className='w-3 h-3' /> {violationsCount} violation
                {violationsCount === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>
        <div className='text-right shrink-0'>
          <p
            className={`text-4xl font-bold tabular-nums ${
              passed ? 'text-success' : 'text-destructive'
            }`}
          >
            {Math.round(score)}%
          </p>
        </div>
      </div>

      {closureCallout && (
        <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3'>
          <ShieldAlert className='w-5 h-5 text-destructive shrink-0 mt-0.5' />
          <div className='space-y-0.5'>
            <p className='text-sm font-medium text-destructive'>
              {closureReason === 'violations' ? 'Session auto-closed' : 'Time expired'}
            </p>
            <p className='text-xs text-destructive/90'>{closureCallout}</p>
          </div>
        </div>
      )}
    </>
  );
}
