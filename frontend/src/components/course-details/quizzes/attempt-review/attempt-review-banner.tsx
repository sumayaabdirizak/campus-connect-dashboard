'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Clock,
  FileQuestion,
  Printer,
  ShieldAlert,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import {
  computeAttemptStats,
  formatElapsedLabel,
  getClosureCallout
} from './helpers';
import { roundToHalfMark } from '../quiz-marks-display';

interface AttemptReviewBannerProps {
  attempt: QuizAttempt;
}

function ResultStatusPill({
  label,
  tone
}: {
  label: string;
  tone: 'emerald' | 'rose' | 'amber' | 'sky' | 'neutral';
}) {
  const toneClass = {
    emerald: 'border-transparent bg-success text-success-foreground',
    rose: 'border-transparent bg-destructive text-white',
    amber: 'border-transparent bg-warning text-white',
    sky: 'border-transparent bg-info text-info-foreground',
    neutral: 'border-transparent bg-secondary text-secondary-foreground'
  }[tone];

  return (
    <Badge size='sm' className={cn('rounded-full px-2.5', toneClass)}>
      {label}
    </Badge>
  );
}

export function AttemptReviewBanner({ attempt }: AttemptReviewBannerProps) {
  const quiz = attempt.quiz;
  const closureReason = attempt.closure_reason ?? null;
  const isOffline = quiz?.mode === 'offline';
  const submittedAt = attempt.submitted_at
    ? format(new Date(attempt.submitted_at), 'MMM d, h:mm a')
    : null;
  const elapsed = formatElapsedLabel(attempt.started_at, attempt.submitted_at);
  const questionCount = quiz?.questions?.length ?? 0;
  const duration = quiz?.duration_minutes;

  if (closureReason === 'absent') {
    return (
      <article className='min-w-0 rounded-xl border bg-card p-5 text-foreground'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
            <span className='inline-flex items-center gap-1'>
              <Printer className='size-3.5 text-info' aria-hidden />
              Printed
            </span>
            {questionCount > 0 ? (
              <span className='inline-flex items-center gap-1'>
                <FileQuestion className='size-3.5 text-primary' aria-hidden />
                {questionCount} questions
              </span>
            ) : null}
          </div>
          <ResultStatusPill label='Absent' tone='rose' />
        </div>
        <h2 className='mt-3 line-clamp-2 text-lg tracking-tight text-foreground font-display'>
          {quiz?.title ?? 'Quiz'}
        </h2>
        <p className='mt-4 text-3xl font-semibold tracking-tight text-foreground'>
          Marked absent
        </p>
        <p className='mt-2 text-sm text-muted-foreground'>
          Your teacher recorded that you did not take this printed quiz.
        </p>
      </article>
    );
  }

  if (closureReason === 'cheat') {
    return (
      <article className='min-w-0 rounded-xl border bg-card p-5 text-foreground'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
            <span className='inline-flex items-center gap-1'>
              <Printer className='size-3.5 text-info' aria-hidden />
              Printed
            </span>
            {questionCount > 0 ? (
              <span className='inline-flex items-center gap-1'>
                <FileQuestion className='size-3.5 text-primary' aria-hidden />
                {questionCount} questions
              </span>
            ) : null}
          </div>
          <ResultStatusPill label='Cheat' tone='rose' />
        </div>
        <h2 className='mt-3 line-clamp-2 text-lg tracking-tight text-foreground font-display'>
          {quiz?.title ?? 'Quiz'}
        </h2>
        <p className='mt-4 text-3xl font-semibold tracking-tight text-foreground'>
          0 marks
        </p>
        <p className='mt-2 text-sm text-muted-foreground'>
          Your teacher recorded a cheating outcome for this printed quiz.
        </p>
      </article>
    );
  }

  // Short-answer questions are manually graded — until every one of them has
  // a grade, points_earned defaults to 0 for the ungraded ones, which would
  // otherwise show a falsely low "final" score while grading is in progress.
  if (!isOffline && attempt.is_graded === false) {
    return (
      <article className='min-w-0 rounded-xl border bg-card p-5 text-foreground'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
            {submittedAt ? (
              <span className='inline-flex items-center gap-1'>
                <CalendarDays className='size-3.5 text-primary' aria-hidden />
                {submittedAt}
              </span>
            ) : null}
            {questionCount > 0 ? (
              <span className='inline-flex items-center gap-1'>
                <FileQuestion className='size-3.5 text-info' aria-hidden />
                {questionCount}
              </span>
            ) : null}
          </div>
          <ResultStatusPill label='Pending review' tone='amber' />
        </div>
        <h2 className='mt-3 line-clamp-2 text-lg tracking-tight text-foreground font-display'>
          {quiz?.title ?? 'Quiz'}
        </h2>
        <p className='mt-4 text-2xl font-semibold tracking-tight text-foreground'>
          Awaiting grading
        </p>
        <p className='mt-2 text-sm text-muted-foreground'>
          Your written answers need to be graded by your teacher before a final score is shown.
        </p>
        {elapsed ? (
          <p className='mt-2 text-xs text-muted-foreground'>Time taken · {elapsed}</p>
        ) : null}
      </article>
    );
  }

  const { totalPoints, earnedPoints, score, passed } = computeAttemptStats(attempt);
  const closureCallout = getClosureCallout(closureReason);
  const rounded = Math.round(score);
  const earned = roundToHalfMark(earnedPoints);
  const total = roundToHalfMark(totalPoints);
  const ring = Math.min(100, Math.max(0, rounded));

  return (
    <>
      <article className='min-w-0 rounded-xl border bg-card p-5 text-foreground'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
            {submittedAt ? (
              <span className='inline-flex items-center gap-1'>
                <CalendarDays className='size-3.5 text-primary' aria-hidden />
                {submittedAt}
              </span>
            ) : null}
            {isOffline ? (
              <span className='inline-flex items-center gap-1'>
                <Printer className='size-3.5 text-info' aria-hidden />
                Printed
              </span>
            ) : duration != null ? (
              <span className='inline-flex items-center gap-1'>
                <Clock className='size-3.5 text-warning' aria-hidden />
                {duration} min
              </span>
            ) : null}
            {questionCount > 0 ? (
              <span className='inline-flex items-center gap-1'>
                <FileQuestion className='size-3.5 text-info' aria-hidden />
                {questionCount}
              </span>
            ) : null}
            {total > 0 ? (
              <span className='inline-flex items-center gap-1'>
                <Timer className='size-3.5 text-warning' aria-hidden />
                {total} marks
              </span>
            ) : null}
          </div>
          <ResultStatusPill
            label={passed ? `Passed · ${rounded}%` : `Needs work · ${rounded}%`}
            tone={passed ? 'emerald' : 'rose'}
          />
        </div>

        <h2 className='mt-3 line-clamp-2 text-lg tracking-tight text-foreground font-display'>
          {quiz?.title ?? 'Quiz'}
        </h2>

        <div className='mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between'>
          <div
            className='relative grid size-28 place-items-center'
            role='img'
            aria-label={`${earned} of ${total} marks, ${rounded} percent`}
          >
            <svg viewBox='0 0 36 36' className='absolute inset-0 size-full -rotate-90'>
              <circle
                cx='18'
                cy='18'
                r='15.5'
                fill='none'
                className='stroke-muted'
                strokeWidth='3'
              />
              <circle
                cx='18'
                cy='18'
                r='15.5'
                fill='none'
                className={passed ? 'stroke-success' : 'stroke-destructive'}
                strokeWidth='3'
                strokeLinecap='round'
                strokeDasharray={`${ring} ${100 - ring}`}
              />
            </svg>
            <div className='relative text-center'>
              <p className='text-2xl font-bold tabular-nums tracking-tight text-foreground'>
                {earned}/{total}
              </p>
              <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                marks
              </p>
            </div>
          </div>

          <div className='min-w-0 flex-1 space-y-2 text-center sm:text-right'>
            <p className='text-3xl font-semibold tabular-nums tracking-tight text-foreground'>
              {rounded}%
            </p>
            <p className='text-sm text-muted-foreground'>
              {passed ? 'Great work — you passed this quiz.' : 'Keep practicing — you can improve.'}
            </p>
            {elapsed ? (
              <p className='text-xs text-muted-foreground'>Time taken · {elapsed}</p>
            ) : null}
            {isOffline ? (
              <p className='text-xs text-muted-foreground'>
                Recorded from your printed quiz — your teacher entered these marks.
              </p>
            ) : null}
          </div>
        </div>
      </article>

      {closureCallout ? (
        <div className='flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4'>
          <ShieldAlert className='mt-0.5 size-5 shrink-0 text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>{closureCallout}</p>
        </div>
      ) : null}
    </>
  );
}
