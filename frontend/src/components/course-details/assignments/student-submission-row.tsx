'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Assignment, Submission, SubmissionExtension } from '@/lib/course-details/services/assignments-types';
import {
  SubmissionFileCell,
  effectiveDue,
  statusOf,
  type SubmissionRow
} from './shared';
import { GradeCell, StatusBadge } from './group-submission-row';

export function StudentSubmissionRow({
  row,
  assignment,
  extensions,
  col,
  selected,
  onToggle,
  onGrade
}: {
  row: SubmissionRow;
  assignment: Assignment;
  extensions: SubmissionExtension[];
  col: (id: string) => boolean;
  selected: boolean;
  onToggle: (studentId: number, checked: boolean) => void;
  onGrade: (sub: Submission) => void;
}) {
  const { studentId, student, submission: sub } = row;
  const target = { studentId };
  const status = statusOf(assignment, sub ?? undefined, extensions, target);
  const eff = effectiveDue(assignment, sub ?? undefined, extensions, target);
  const isOverridden =
    eff.getTime() !== new Date(assignment.due_date).getTime();

  return (
    <PosTableRow className={cn(selected && 'bg-primary/[0.04]', !sub && 'bg-muted')}>
      <PosTableCell className='w-10'>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggle(studentId, !!v)}
          className='size-[18px] border-2 border-[#94A3B8] bg-card data-[state=checked]:border-primary'
        />
      </PosTableCell>
      {col('name') ? (
        <PosTableCell className='min-w-[200px] max-w-[360px] whitespace-normal'>
          <p className='truncate text-sm font-medium'>{student.full_name}</p>
        </PosTableCell>
      ) : null}
      {col('submitted') ? (
        <PosTableCell>
          {sub?.submitted_at ? (
            <span className='text-muted-foreground text-sm'>
              {format(new Date(sub.submitted_at), 'MMM d, h:mm a')}
            </span>
          ) : (
            <span className='text-muted-foreground text-sm'>—</span>
          )}
        </PosTableCell>
      ) : null}
      {col('due') ? (
        <PosTableCell>
          <span className={cn('text-sm', isOverridden && 'font-medium text-warning')}>
            {format(eff, 'MMM d, h:mm a')}
          </span>
        </PosTableCell>
      ) : null}
      {col('status') ? (
        <PosTableCell>
          <StatusBadge status={status} />
        </PosTableCell>
      ) : null}
      {col('grade') ? (
        <PosTableCell>
          <GradeCell sub={sub} />
        </PosTableCell>
      ) : null}
      {col('file') ? (
        <PosTableCell>
          <SubmissionFileCell
            submission={sub}
            label={`${student.full_name}'s submission`}
          />
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        {sub ? (
          <Button variant='outline' size='sm' className='h-8' onClick={() => onGrade(sub)}>
            {sub.is_reviewed && sub.grade != null ? 'Review' : 'Grade'}
          </Button>
        ) : (
          <span className='text-xs text-muted-foreground'>No submission</span>
        )}
      </PosTableCell>
    </PosTableRow>
  );
}
