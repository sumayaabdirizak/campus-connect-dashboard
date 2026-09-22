'use client';

import { format } from 'date-fns';
import { Check, Eye, Loader2, ShieldAlert, Square, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { InitialsAvatar } from '@/components/course-details/_shared/initials-avatar';
import { cn } from '@/lib/utils';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import {
  earnedMarksFromPercent,
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
  totalPoints,
  quizClosed = false
}: {
  row: AttemptRow;
  col: (id: string) => boolean;
  onGrade: (attempt: QuizAttempt) => void;
  isOffline: boolean;
  quizId: number;
  totalPoints: number;
  quizClosed?: boolean;
}) {
  const { studentId, student, attempt } = row;
  const status = rowStatus(row, { quizClosed });
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
        : status === 'not_started'
          ? 'Not started'
          : status === 'in_progress'
            ? 'In progress'
            : status === 'missed'
              ? 'Missed'
              : 'Submitted';

  return (
    <PosTableRow
      className={cn(
        canOpen && 'cursor-pointer',
        status === 'not_started' && !isOffline && 'bg-muted',
        status === 'missed' && !isOffline && 'bg-destructive/5'
      )}
      onClick={() => canOpen && onGrade(attempt!)}
    >
      {col('student') ? (
        <PosTableCell className='min-w-[200px] max-w-[360px] whitespace-normal'>
          <div className='flex items-center gap-2.5'>
            <InitialsAvatar name={student.full_name} />
            <p className='truncate text-sm font-medium'>{student.full_name}</p>
          </div>
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
                'gap-1 capitalize rounded-full font-medium',
                isCheat
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : isAbsent
                    ? 'border-border bg-muted text-muted-foreground'
                    : status === 'submitted'
                      ? 'border-success/30 bg-success/10 text-success'
                      : status === 'in_progress'
                        ? 'border-warning/30 bg-warning/10 text-warning'
                        : status === 'missed'
                          ? 'border-destructive/30 bg-destructive/10 text-destructive'
                          : 'border-border bg-muted text-muted-foreground'
              )}
            >
              {isAbsent ? <UserX className='size-3' /> : null}
              {isCheat ? <ShieldAlert className='size-3' /> : null}
              {!isAbsent && !isCheat && status === 'submitted' ? (
                <Check className='size-3' />
              ) : null}
              {status === 'in_progress' ? <Loader2 className='size-3 animate-spin' /> : null}
              {!isAbsent && !isCheat && (status === 'not_started' || status === 'missed') ? (
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
          {isOffline ? (
            <div onClick={(e) => e.stopPropagation()} className='space-y-1'>
              {isAbsent ? (
                <p className='text-xs text-muted-foreground'>Absent — no score</p>
              ) : null}
              {isCheat ? (
                <p className='text-xs font-medium text-destructive'>
                  Cheating — 0 / {totalPoints}
                </p>
              ) : null}
              <OfflineResultPicker
                quizId={quizId}
                studentId={studentId}
                studentName={student.full_name}
                totalPoints={totalPoints}
                initialMarks={
                  attempt && !isAbsent && !isCheat && attempt.score != null
                    ? earnedMarksFromPercent(attempt.score, totalPoints)
                    : null
                }
              />
            </div>
          ) : attempt?.score != null ? (
            <span className='text-sm font-medium'>
              {formatMarksWithPercent(
                earnedMarksFromPercent(attempt.score, totalPoints),
                totalPoints,
                attempt.score
              )}
            </span>
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
