'use client';

import { format } from 'date-fns';
import { Check, Eye, Loader2, ShieldAlert, Square, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { cn } from '@/lib/utils';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import {
  earnedMarksFromPercent,
  formatMarksFraction,
  formatMarksWithPercent
} from '../quiz-marks-display';
import { needsGrading, offlineOutcome, rowStatus, type AttemptRow } from './helpers';
import { OfflineResultPicker } from './offline-result-picker';

export function AttemptTableRow({
  row,
  col,
  onGrade,
  isOffline,
  quizId,
  totalPoints
}: {
  row: AttemptRow;
  col: (id: string) => boolean;
  onGrade: (attempt: QuizAttempt) => void;
  isOffline: boolean;
  quizId: number;
  totalPoints: number;
}) {
  const { studentId, student, attempt } = row;
  const status = rowStatus(row);
  const pending = attempt && !isOffline ? needsGrading(attempt) : false;
  const isAutoSubmit = attempt?.closure_reason === 'time_expired';
  const closedForViolations = attempt?.closure_reason === 'violations';
  const outcome = offlineOutcome(attempt);
  const isAbsent = outcome === 'absent';
  const isCheat = outcome === 'cheat';
  const violations = attempt?.violations_count ?? 0;
  const canOpen = !isOffline && !!attempt;

  const statusLabel = isAbsent
    ? 'Absent'
    : isCheat
      ? 'Cheating'
      : isOffline
        ? status === 'submitted'
          ? 'Recorded'
          : 'Not recorded'
        : status.replace('_', ' ');

  return (
    <PosTableRow
      className={cn(
        canOpen && 'cursor-pointer',
        status === 'not_started' && !isOffline && 'bg-muted'
      )}
      onClick={() => canOpen && onGrade(attempt!)}
    >
      {col('student') ? (
        <PosTableCell className='min-w-[200px] max-w-[360px] whitespace-normal'>
          <p className='truncate text-sm font-medium'>{student.full_name}</p>
        </PosTableCell>
      ) : null}

      {col('started') ? (
        <PosTableCell>
          {attempt?.started_at ? (
            <span className='text-sm text-muted-foreground'>
              {format(new Date(attempt.started_at), 'MMM d, h:mm a')}
            </span>
          ) : (
            <span className='text-sm text-muted-foreground'>—</span>
          )}
        </PosTableCell>
      ) : null}

      {col('submitted') ? (
        <PosTableCell>
          {attempt?.submitted_at ? (
            <span className='text-sm text-muted-foreground'>
              {format(new Date(attempt.submitted_at), 'MMM d, h:mm a')}
            </span>
          ) : (
            <span className='text-sm text-muted-foreground'>—</span>
          )}
        </PosTableCell>
      ) : null}

      {col('status') ? (
        <PosTableCell>
          <div className='flex flex-wrap gap-1'>
            <Badge
              variant='outline'
              size='xs'
              className={cn(
                'gap-1 capitalize rounded-full',
                isCheat
                  ? 'text-destructive border-destructive/40'
                  : isAbsent
                    ? 'text-muted-foreground'
                    : status === 'submitted'
                      ? 'text-success border-success'
                      : status === 'in_progress'
                        ? 'text-warning border-warning'
                        : 'text-muted-foreground'
              )}
            >
              {isAbsent ? <UserX className='size-3' /> : null}
              {isCheat ? <ShieldAlert className='size-3' /> : null}
              {!isAbsent && !isCheat && status === 'submitted' ? (
                <Check className='size-3' />
              ) : null}
              {status === 'in_progress' ? <Loader2 className='size-3 animate-spin' /> : null}
              {!isAbsent && !isCheat && status === 'not_started' ? (
                <Square className='size-3' />
              ) : null}
              {statusLabel}
            </Badge>
            {isAutoSubmit ? (
              <Badge variant='outline' size='xs' className='rounded-full'>
                Time expired
              </Badge>
            ) : null}
            {closedForViolations ? (
              <Badge variant='destructive' size='xs' className='rounded-full'>
                Auto-closed
              </Badge>
            ) : null}
            {pending ? (
              <Badge variant='destructive' size='xs' className='rounded-full'>
                Needs grading
              </Badge>
            ) : null}
          </div>
        </PosTableCell>
      ) : null}

      {col('monitoring') ? (
        <PosTableCell>
          {violations > 0 ? (
            <Badge
              variant='outline'
              size='xs'
              className='gap-1 rounded-full text-destructive border-destructive/40'
              title={
                closedForViolations
                  ? 'Quiz auto-closed for violations'
                  : `${violations} monitoring event${violations === 1 ? '' : 's'}`
              }
            >
              <ShieldAlert className='size-3' />
              {violations} violation{violations === 1 ? '' : 's'}
            </Badge>
          ) : (
            <span className='text-sm text-muted-foreground'>clean</span>
          )}
        </PosTableCell>
      ) : null}

      {col('marks') ? (
        <PosTableCell align='right' className='tabular-nums'>
          {attempt ? (
            isOffline ? (
              isAbsent ? (
                <span className='text-sm text-muted-foreground'>Absent — no score</span>
              ) : isCheat ? (
                <span className='text-sm font-medium text-destructive'>
                  Cheating — 0 / {totalPoints}
                </span>
              ) : (
                <span className='text-sm font-medium'>
                  {formatMarksFraction(
                    earnedMarksFromPercent(attempt.score ?? 0, totalPoints),
                    totalPoints
                  )}
                </span>
              )
            ) : attempt.score != null ? (
              <span className='text-sm font-medium'>
                {formatMarksWithPercent(
                  earnedMarksFromPercent(attempt.score, totalPoints),
                  totalPoints,
                  attempt.score
                )}
              </span>
            ) : (
              <span className='text-sm text-muted-foreground'>—</span>
            )
          ) : isOffline ? (
            <div onClick={(e) => e.stopPropagation()}>
              <OfflineResultPicker
                quizId={quizId}
                studentId={studentId}
                studentName={student.full_name}
                totalPoints={totalPoints}
              />
            </div>
          ) : (
            <span className='text-sm text-muted-foreground'>—</span>
          )}
        </PosTableCell>
      ) : null}

      {!isOffline ? (
        <PosTableCell align='right'>
          {attempt ? (
            <Button
              variant='outline'
              size='sm'
              className='h-8 gap-1'
              onClick={(e) => {
                e.stopPropagation();
                onGrade(attempt);
              }}
            >
              <Eye className='size-3.5' />
              {pending ? 'Grade' : 'Review'}
            </Button>
          ) : (
            <span className='text-xs text-muted-foreground'>—</span>
          )}
        </PosTableCell>
      ) : null}
    </PosTableRow>
  );
}
