'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { AlertTriangle, CalendarClock, Check, Users, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Assignment, Submission, SubmissionExtension } from '@/lib/course-details/services/assignments-types';
import { SubmissionFileCell, statusOf, type GroupRow, type SubmissionStatus } from './shared';

export function GroupSubmissionRow({
  row,
  assignment,
  extensions,
  col,
  selected,
  onToggle,
  onGrade
}: {
  row: GroupRow;
  assignment: Assignment;
  extensions: SubmissionExtension[];
  col: (id: string) => boolean;
  selected: boolean;
  onToggle: (groupId: number, checked: boolean) => void;
  onGrade: (sub: Submission) => void;
}) {
  const { groupId, groupName, members, submission: sub } = row;
  const status = statusOf(assignment, sub ?? undefined, extensions, { groupId });

  return (
    <PosTableRow className={cn(selected && 'bg-primary/[0.04]', !sub && 'bg-muted')}>
      <PosTableCell className='w-10'>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggle(groupId, !!v)}
          className='size-[18px] border-2 border-[#94A3B8] bg-card data-[state=checked]:border-primary'
        />
      </PosTableCell>
      {col('name') ? (
        <PosTableCell className='min-w-[160px]'>
          <div className='flex items-center gap-2'>
            <Users className='size-4 shrink-0 text-muted-foreground' />
            <span className='text-sm font-medium'>{groupName}</span>
          </div>
        </PosTableCell>
      ) : null}
      {col('members') ? (
        <PosTableCell className='max-w-[280px] whitespace-normal'>
          <div className='flex flex-wrap gap-1'>
            {members.map((m) => (
              <span
                key={m.id}
                className='rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-foreground'
              >
                {m.full_name}
              </span>
            ))}
            {members.length === 0 ? (
              <span className='text-xs italic text-muted-foreground'>No members</span>
            ) : null}
          </div>
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
          <SubmissionFileCell submission={sub} label={`${groupName} submission`} />
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

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge
      variant='outline'
      className={`gap-1 capitalize ${
        status === 'submitted'
          ? 'text-success border-success'
          : status === 'late'
            ? 'text-warning border-warning'
            : status === 'extended'
              ? 'text-primary border-primary/40'
              : 'text-destructive border-destructive/40'
      }`}
    >
      {status === 'submitted' ? <Check className='size-3' /> : null}
      {status === 'late' ? <AlertTriangle className='size-3' /> : null}
      {status === 'extended' ? <CalendarClock className='size-3' /> : null}
      {status === 'missing' ? <XIcon className='size-3' /> : null}
      {status}
    </Badge>
  );
}

function GradeCell({ sub }: { sub: Submission | null }) {
  if (sub?.grade != null) {
    return <span className='font-medium tabular-nums'>{sub.grade}%</span>;
  }
  if (sub?.is_reviewed) {
    return <span className='text-xs text-muted-foreground'>reviewed</span>;
  }
  return <span className='text-xs text-muted-foreground'>—</span>;
}

export { StatusBadge, GradeCell };
