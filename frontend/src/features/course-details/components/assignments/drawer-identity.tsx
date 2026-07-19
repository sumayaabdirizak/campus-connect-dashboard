'use client';

import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { Assignment, Submission } from '../../api/assignments-types';
import type { GroupRow } from './shared';

export function DrawerIdentity({
  assignment,
  submission,
  allGroupRows
}: {
  assignment: Assignment;
  submission: Submission;
  allGroupRows: GroupRow[];
}) {
  if (assignment.workMode === 'GROUP' && submission.groupId != null) {
    const groupRow = allGroupRows.find((r) => r.groupId === submission.groupId);
    return (
      <div className='rounded-3xl border bg-muted/20 p-4 shadow-sm'>
        <div className='flex items-center gap-2'>
          <Users className='w-4 h-4 text-muted-foreground' />
          <p className='font-medium'>{groupRow?.groupName ?? 'Group'}</p>
        </div>
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {groupRow?.members.map((m) => (
            <span
              key={m.id}
              className='rounded-full bg-background px-2 py-1 text-xs shadow-sm'
            >
              {m.full_name}
            </span>
          ))}
        </div>
        <Badge variant='outline' className='mt-3'>
          {assignment.gradingScope === 'GROUP'
            ? 'Group grade · fans out to all members'
            : 'Individual grade · each member graded separately'}
        </Badge>
      </div>
    );
  }
  return (
    <div className='rounded-3xl border bg-muted/20 p-4 shadow-sm'>
      <p className='font-medium'>{submission.student?.full_name ?? '—'}</p>
      <p className='text-sm text-muted-foreground'>{submission.student?.number ?? '—'}</p>
    </div>
  );
}
