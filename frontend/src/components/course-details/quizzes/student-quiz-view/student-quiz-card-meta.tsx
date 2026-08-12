'use client';

import { Badge } from '@/components/ui/badge';
import { Award, Check, ClipboardList, Clock, PlayCircle, XCircle } from 'lucide-react';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { closingSoon, minutesLeft } from './helpers';

export function StudentQuizCardMeta({ quiz: q }: { quiz: Quiz }) {
  const inProgress = q.inProgressAttempt ?? null;
  const ipMinutesLeft = minutesLeft(inProgress?.expires_at ?? null);
  const attemptsUsed = q.attemptsUsed ?? 0;
  const showAttempts = q.max_attempts > 1;
  const last = q.lastAttempt ?? null;
  const best = q.bestScore;
  const lastScoreRounded = last?.score != null ? Math.round(last.score) : null;
  const bestScoreRounded = best != null ? Math.round(best) : null;
  const soon = closingSoon(q.close_at);

  return (
    <div className='min-w-0 flex-1 space-y-1.5'>
      <div className='flex items-center gap-2 flex-wrap'>
        <ClipboardList className='w-4 h-4 text-muted-foreground shrink-0' />
        <p className='font-medium truncate select-none'>{q.title}</p>
        {inProgress ? (
          <Badge variant='warning' size='xs' className='gap-1'>
            <PlayCircle className='w-3 h-3' />
            In progress
          </Badge>
        ) : null}
        {soon && !inProgress ? (
          <Badge variant='destructive' className='gap-1 text-[10px]'>
            <Clock className='w-3 h-3' />
            Closes soon
          </Badge>
        ) : null}
        {showAttempts ? (
          <Badge variant='secondary' className='text-[10px] tabular-nums'>
            Attempt {Math.min(attemptsUsed + (inProgress ? 0 : 1), q.max_attempts)} of{' '}
            {q.max_attempts}
          </Badge>
        ) : null}
        {last && lastScoreRounded != null ? (
          <Badge
            variant='outline'
            className={`gap-1 text-[10px] tabular-nums ${
              last.passed === true
                ? 'text-success border-success'
                : last.passed === false
                  ? 'text-destructive border-destructive/40'
                  : 'text-muted-foreground'
            }`}
            title={`Submitted ${new Date(last.submitted_at).toLocaleString()}`}
          >
            {last.passed === true ? (
              <Check className='w-3 h-3' />
            ) : last.passed === false ? (
              <XCircle className='w-3 h-3' />
            ) : null}
            Last: {lastScoreRounded}%
          </Badge>
        ) : null}
        {bestScoreRounded != null &&
        lastScoreRounded != null &&
        bestScoreRounded > lastScoreRounded ? (
          <Badge
            variant='warning'
            size='xs'
            className='gap-1 tabular-nums'
            title='Your best score on this quiz so far'
          >
            <Award className='w-3 h-3' />
            Best: {bestScoreRounded}%
          </Badge>
        ) : null}
        {last && !last.is_graded && lastScoreRounded == null ? (
          <Badge
            variant='outline'
            className='text-[10px] text-muted-foreground'
            title='Waiting on teacher to grade short-answer questions'
          >
            Awaiting grade
          </Badge>
        ) : null}
      </div>
      {q.description ? (
        <p className='text-sm text-muted-foreground line-clamp-2'>{q.description}</p>
      ) : null}
      <div className='flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums flex-wrap'>
        <span className='inline-flex items-center gap-1'>
          <Clock className='w-3 h-3' />
          {q.duration_minutes} min
        </span>
        <span aria-hidden>·</span>
        <span>{q.questions?.length ?? 0} questions</span>
        <span aria-hidden>·</span>
        <span>pass ≥ {q.passing_score}%</span>
        {inProgress && ipMinutesLeft !== null ? (
          <>
            <span aria-hidden>·</span>
            <span className='text-warning font-medium'>
              {ipMinutesLeft > 0 ? `${ipMinutesLeft} min left` : 'expiring now'}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
