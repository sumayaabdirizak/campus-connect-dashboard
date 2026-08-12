'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { AlertTriangle, Check, Users, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { Submission } from '@/lib/course-details/services/assignments-types';
import { SubmissionFileCell, type GroupRow } from './shared';

export function GroupSubmissionRow({
  row,
  selected,
  onToggle,
  onGrade
}: {
  row: GroupRow;
  selected: boolean;
  onToggle: (groupId: number, checked: boolean) => void;
  onGrade: (sub: Submission) => void;
}) {
  const { groupId, groupName, members, submission: sub } = row;
  const status: 'submitted' | 'late' | 'missing' = sub
    ? sub.is_late
      ? 'late'
      : 'submitted'
    : 'missing';

  return (
    <TableRow
      className={`transition-colors hover:bg-muted/35 [&>td]:py-3 ${
        !sub ? 'bg-muted/15 text-muted-foreground' : ''
      }`}
    >
      <TableCell className='align-top'>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggle(groupId, !!v)}
        />
      </TableCell>
      <TableCell className='align-top font-medium text-foreground'>
        <div className='flex items-center gap-2'>
          <Users className='w-4 h-4 text-muted-foreground shrink-0' />
          {groupName}
        </div>
      </TableCell>
      <TableCell className='align-top'>
        <div className='flex flex-wrap gap-1'>
          {members.map((m) => (
            <span
              key={m.id}
              className='text-xs bg-muted/50 rounded px-1.5 py-0.5'
              title={m.email}
            >
              {m.full_name}
            </span>
          ))}
          {members.length === 0 ? (
            <span className='text-xs text-muted-foreground italic'>No members</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className='align-top whitespace-nowrap'>
        {sub?.submitted_at ? (
          format(new Date(sub.submitted_at), 'MMM d, h:mm a')
        ) : (
          <span className='text-muted-foreground text-xs'>—</span>
        )}
      </TableCell>
      <TableCell className='align-top'>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell className='align-top'>
        <GradeCell sub={sub} />
      </TableCell>
      <TableCell className='align-top'>
        <SubmissionFileCell submission={sub} label={`${groupName} submission`} />
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

function StatusBadge({ status }: { status: 'submitted' | 'late' | 'missing' }) {
  return (
    <Badge
      variant='outline'
      className={`gap-1 capitalize ${
        status === 'submitted'
          ? 'text-success border-success'
          : status === 'late'
            ? 'text-warning border-warning'
            : 'text-destructive border-destructive/40'
      }`}
    >
      {status === 'submitted' ? <Check className='w-3 h-3' /> : null}
      {status === 'late' ? <AlertTriangle className='w-3 h-3' /> : null}
      {status === 'missing' ? <XIcon className='w-3 h-3' /> : null}
      {status}
    </Badge>
  );
}

function GradeCell({ sub }: { sub: Submission | null }) {
  if (sub?.grade != null) {
    return <span className='tabular-nums font-medium'>{sub.grade}%</span>;
  }
  if (sub?.is_reviewed) {
    return <span className='text-xs text-muted-foreground'>reviewed</span>;
  }
  return <span className='text-xs text-muted-foreground'>—</span>;
}

export { StatusBadge, GradeCell };
