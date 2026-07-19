'use client';

import { format } from 'date-fns';
import { Check, Eye, Loader2, ShieldAlert, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import type { QuizAttempt } from '../../api/quizzes-types';
import { needsGrading, rowStatus, type AttemptRow } from './helpers';

export function AttemptTableRow({
  row,
  onGrade,
}: {
  row: AttemptRow;
  onGrade: (attempt: QuizAttempt) => void;
}) {
  const { studentId, student, attempt } = row;
  const status = rowStatus(row);
  const pending = attempt ? needsGrading(attempt) : false;
  const isAutoSubmit = attempt?.closure_reason === 'time_expired';
  const closedForViolations = attempt?.closure_reason === 'violations';
  const violations = attempt?.violations_count ?? 0;

  return (
    <TableRow
      className={attempt ? 'cursor-pointer hover:bg-muted/30' : 'opacity-60'}
      onClick={() => attempt && onGrade(attempt)}
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
      <TableCell>
        <div className='flex flex-wrap gap-1'>
          <Badge
            variant='outline'
            className={`text-[10px] gap-1 capitalize ${
              status === 'submitted'
                ? 'text-success border-success'
                : status === 'in_progress'
                  ? 'text-warning border-warning'
                  : 'text-muted-foreground'
            }`}
          >
            {status === 'submitted' ? <Check className='w-3 h-3' /> : null}
            {status === 'in_progress' ? <Loader2 className='w-3 h-3' /> : null}
            {status === 'not_started' ? <Square className='w-3 h-3' /> : null}
            {status.replace('_', ' ')}
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
      <TableCell className='text-right tabular-nums'>
        {attempt?.score != null ? (
          `${Math.round(attempt.score)}%`
        ) : (
          <span className='text-xs text-muted-foreground'>—</span>
        )}
      </TableCell>
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
    </TableRow>
  );
}
