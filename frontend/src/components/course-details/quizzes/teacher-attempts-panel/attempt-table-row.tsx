'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, Eye, Loader2, ShieldAlert, Square, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { useCreateOfflineAttempt } from '@/lib/course-details/queries/quizzes-queries';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import { needsGrading, rowStatus, type AttemptRow } from './helpers';

export function AttemptTableRow({
  row,
  onGrade,
  isOffline,
  quizId,
  totalPoints,
}: {
  row: AttemptRow;
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
  const isAbsent = attempt?.closure_reason === 'absent';
  const violations = attempt?.violations_count ?? 0;
  const [marks, setMarks] = useState('');
  const recordMutation = useCreateOfflineAttempt(quizId);

  const handleRecordMarks = () => {
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

  const handleMarkAbsent = () => {
    recordMutation.mutate(
      { studentId, outcome: { absent: true } },
      {
        onSuccess: () => toast.success(`Marked ${student.full_name} absent`),
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const canOpen = !isOffline && !!attempt;

  return (
    <TableRow
      className={canOpen ? 'cursor-pointer hover:bg-muted/30' : isOffline ? '' : 'opacity-60'}
      onClick={() => canOpen && onGrade(attempt!)}
    >
      <TableCell>
        <div className='flex flex-col gap-0.5'>
          <span className='font-medium'>{student.full_name}</span>
          {student.number ? (
            <span className='text-[11px] text-muted-foreground tabular-nums'>
              {student.number}
            </span>
          ) : null}
        </div>
      </TableCell>
      {isOffline ? null : (
        <>
          <TableCell className='text-muted-foreground'>
            {attempt?.started_at ? (
              format(new Date(attempt.started_at), 'MMM d, h:mm a')
            ) : (
              <span className='text-xs'>—</span>
            )}
          </TableCell>
          <TableCell className='text-muted-foreground'>
            {attempt?.submitted_at ? (
              format(new Date(attempt.submitted_at), 'MMM d, h:mm a')
            ) : (
              <span className='text-xs'>—</span>
            )}
          </TableCell>
        </>
      )}
      <TableCell>
        <div className='flex flex-wrap gap-1'>
          <Badge
            variant='outline'
            className={`text-[10px] gap-1 capitalize ${
              isAbsent
                ? 'text-muted-foreground'
                : status === 'submitted'
                  ? 'text-success border-success'
                  : status === 'in_progress'
                    ? 'text-warning border-warning'
                    : 'text-muted-foreground'
            }`}
          >
            {isAbsent ? <UserX className='w-3 h-3' /> : null}
            {!isAbsent && status === 'submitted' ? <Check className='w-3 h-3' /> : null}
            {status === 'in_progress' ? <Loader2 className='w-3 h-3' /> : null}
            {!isAbsent && status === 'not_started' ? <Square className='w-3 h-3' /> : null}
            {isAbsent
              ? 'absent'
              : isOffline
                ? status === 'submitted'
                  ? 'recorded'
                  : 'not recorded'
                : status.replace('_', ' ')}
          </Badge>
          {isAutoSubmit ? (
            <Badge variant='outline' className='text-[10px]'>
              Time expired
            </Badge>
          ) : null}
          {closedForViolations ? (
            <Badge variant='destructive' className='text-[10px]'>
              Auto-closed
            </Badge>
          ) : null}
          {pending ? (
            <Badge variant='destructive' className='text-[10px]'>
              Needs grading
            </Badge>
          ) : null}
        </div>
      </TableCell>
      {isOffline ? null : (
        <TableCell>
          {violations > 0 ? (
            <Badge
              variant='outline'
              className='gap-1 text-[10px] text-destructive border-destructive/40'
              title={
                closedForViolations
                  ? 'Quiz auto-closed for violations'
                  : `${violations} monitoring event${violations === 1 ? '' : 's'}`
              }
            >
              <ShieldAlert className='w-3 h-3' />
              {violations} violation{violations === 1 ? '' : 's'}
            </Badge>
          ) : (
            <span className='text-xs text-muted-foreground'>clean</span>
          )}
        </TableCell>
      )}
      <TableCell className='text-right tabular-nums'>
        {attempt ? (
          isOffline ? (
            isAbsent ? (
              <span className='text-xs text-muted-foreground'>—</span>
            ) : (
              <span className='font-medium'>
                {Math.round(((attempt.score ?? 0) / 100) * totalPoints)} / {totalPoints}
              </span>
            )
          ) : attempt.score != null ? (
            `${Math.round(attempt.score)}%`
          ) : (
            <span className='text-xs text-muted-foreground'>—</span>
          )
        ) : isOffline ? (
          <div className='flex items-center justify-end gap-1'>
            <Input
              type='number'
              min={0}
              max={totalPoints}
              placeholder={`/ ${totalPoints}`}
              value={marks}
              onChange={(e) =>
                setMarks(String(Math.min(Math.max(Number(e.target.value) || 0, 0), totalPoints)))
              }
              className='h-8 w-20 text-sm tabular-nums'
              disabled={recordMutation.isPending}
            />
            <Button
              size='icon'
              variant='outline'
              className='h-8 w-8 shrink-0'
              disabled={recordMutation.isPending || marks === ''}
              onClick={handleRecordMarks}
              aria-label={`Record marks for ${student.full_name}`}
            >
              {recordMutation.isPending ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Check className='w-3.5 h-3.5' />
              )}
            </Button>
            <Button
              size='icon'
              variant='outline'
              className='h-8 w-8 shrink-0 text-muted-foreground'
              disabled={recordMutation.isPending}
              onClick={handleMarkAbsent}
              title='Mark absent — did not take the offline quiz'
              aria-label={`Mark ${student.full_name} absent`}
            >
              <UserX className='w-3.5 h-3.5' />
            </Button>
          </div>
        ) : (
          <span className='text-xs text-muted-foreground'>—</span>
        )}
      </TableCell>
      {isOffline ? null : (
        <TableCell className='text-right pr-2'>
          {attempt ? (
            <Button
              variant='ghost'
              size='sm'
              className='gap-1'
              onClick={(e) => {
                e.stopPropagation();
                onGrade(attempt);
              }}
            >
              <Eye className='w-3.5 h-3.5' />
              {pending ? 'Grade' : 'Review'}
            </Button>
          ) : (
            <span className='text-xs text-muted-foreground pr-3'>—</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
