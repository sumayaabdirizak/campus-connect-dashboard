'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import type { Assignment, Submission, SubmissionExtension } from '../../api/assignments-types';
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
  selected,
  onToggle,
  onGrade
}: {
  row: SubmissionRow;
  assignment: Assignment;
  extensions: SubmissionExtension[];
  selected: boolean;
  onToggle: (studentId: number, checked: boolean) => void;
  onGrade: (sub: Submission) => void;
}) {
  const { studentId, student, submission: sub } = row;
  const status = statusOf(assignment, sub ?? undefined, extensions);
  const eff = sub
    ? effectiveDue(assignment, sub, extensions)
    : new Date(assignment.due_date);
  const isOverridden = sub
    ? eff.getTime() !== new Date(assignment.due_date).getTime()
    : false;

  return (
    <TableRow
      className={`transition-colors hover:bg-muted/35 [&>td]:py-3 ${
        !sub ? 'bg-muted/15 text-muted-foreground' : ''
      }`}
    >
      <TableCell className='align-top'>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggle(studentId, !!v)}
        />
      </TableCell>
      <TableCell className='align-top'>
        <div className='min-w-0'>
          <p className='truncate font-medium text-foreground'>{student.full_name}</p>
          <p className='truncate text-xs text-muted-foreground'>{student.email}</p>
        </div>
      </TableCell>
      <TableCell className='align-top whitespace-nowrap'>
        {sub?.submitted_at ? (
          format(new Date(sub.submitted_at), 'MMM d, h:mm a')
        ) : (
          <span className='text-muted-foreground text-xs'>—</span>
        )}
      </TableCell>
      <TableCell className='align-top whitespace-nowrap'>
        <span className={isOverridden ? 'font-medium text-warning' : ''}>
          {format(eff, 'MMM d, h:mm a')}
        </span>
      </TableCell>
      <TableCell className='align-top'>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell className='align-top'>
        <GradeCell sub={sub} />
      </TableCell>
      <TableCell className='align-top'>
        <SubmissionFileCell
          submission={sub}
          label={`${student.full_name}'s submission`}
        />
      </TableCell>
      <TableCell className='align-top text-right'>
        {sub ? (
          <Button variant='outline' size='sm' onClick={() => onGrade(sub)}>
            Grade
          </Button>
        ) : (
          <span className='text-xs text-muted-foreground px-3'>No submission</span>
        )}
      </TableCell>
    </TableRow>
  );
}
