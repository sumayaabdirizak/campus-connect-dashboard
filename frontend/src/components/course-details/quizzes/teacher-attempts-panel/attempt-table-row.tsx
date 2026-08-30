'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, Eye, Loader2, ShieldAlert, Square, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { cn } from '@/lib/utils';
import { useCreateOfflineAttempt } from '@/lib/course-details/queries/quizzes-queries';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import {
  earnedMarksFromPercent,
  formatMarksFraction,
  formatMarksWithPercent
} from '../quiz-marks-display';
import { needsGrading, offlineOutcome, rowStatus, type AttemptRow } from './helpers';

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
  const [marks, setMarks] = useState('');
  const recordMutation = useCreateOfflineAttempt(quizId);

  const recordMarks = () => {
    const value = Math.min(Math.max(Number(marks) || 0, 0), totalPoints);
    recordMutation.mutate(
      { studentId, outcome: { marksEarned: value } },
      {
        onSuccess: () => {
          toast.success(`Recorded ${value}/${totalPoints} for ${student.full_name}`);
          setMarks('');
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const recordAbsent = () => {
    if (
      !window.confirm(
        `Mark ${student.full_name} as Absent?\n\nThey did not take this quiz. No score will be saved.`
      )
    ) {
      return;
    }
    recordMutation.mutate(
      { studentId, outcome: { absent: true } },
      {
        onSuccess: () => toast.success(`${student.full_name} marked Absent`),
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const recordCheat = () => {
    if (
      !window.confirm(
        `Mark ${student.full_name} for Cheating?\n\nTheir score will be saved as 0 / ${totalPoints}.`
      )
    ) {
      return;
    }
    recordMutation.mutate(
      { studentId, outcome: { cheat: true } },
      {
        onSuccess: () =>
          toast.success(`${student.full_name} marked Cheating (0 marks)`),
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const canSaveMarks = marks !== '' && !Number.isNaN(Number(marks));
  const canOpen = !isOffline && !!attempt;
  const busy = recordMutation.isPending;

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
            <div
              className='inline-flex min-w-[16rem] flex-col gap-2 rounded-lg border border-border bg-muted p-2.5 text-left'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center gap-2'>
                <Input
                  type='number'
                  min={0}
                  max={totalPoints}
                  placeholder='0'
                  value={marks}
                  onChange={(e) =>
                    setMarks(
                      String(Math.min(Math.max(Number(e.target.value) || 0, 0), totalPoints))
                    )
                  }
                  className='h-9 w-16 bg-card text-center text-sm tabular-nums'
                  disabled={busy}
                  aria-label={`Score for ${student.full_name}`}
                />
                <span className='shrink-0 text-sm text-muted-foreground'>
                  out of {totalPoints}
                </span>
                <Button
                  size='sm'
                  className='h-9 shrink-0'
                  disabled={busy || !canSaveMarks}
                  onClick={recordMarks}
                  aria-label={`Save score for ${student.full_name}`}
                >
                  {busy ? <Loader2 className='size-3.5 animate-spin' /> : null}
                  Save score
                </Button>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                  Or
                </span>
                <div className='h-px flex-1 bg-border' />
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-9 gap-1.5 bg-card'
                  disabled={busy}
                  onClick={recordAbsent}
                  aria-label={`Mark ${student.full_name} absent`}
                >
                  <UserX className='size-3.5' />
                  Absent
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-9 gap-1.5 bg-card text-destructive border-destructive/30 hover:bg-destructive/5'
                  disabled={busy}
                  onClick={recordCheat}
                  aria-label={`Mark ${student.full_name} for cheating`}
                >
                  <ShieldAlert className='size-3.5' />
                  Cheating
                </Button>
              </div>
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
