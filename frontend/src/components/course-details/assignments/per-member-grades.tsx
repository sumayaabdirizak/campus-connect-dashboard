'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { GroupRow } from './shared';

export function PerMemberGrades({
  assignment,
  submission,
  allGroupRows,
  submissions,
  memberGrades,
  setMemberGrades,
  memberFeedbacks,
  setMemberFeedbacks,
  gradePending,
  onSave,
  hideSaveButton = false
}: {
  assignment: Assignment;
  submission: Submission;
  allGroupRows: GroupRow[];
  submissions: Submission[];
  memberGrades: Map<number, string>;
  setMemberGrades: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  memberFeedbacks: Map<number, string>;
  setMemberFeedbacks: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  gradePending: boolean;
  onSave: () => void;
  hideSaveButton?: boolean;
}) {
  const groupRow = allGroupRows.find((r) => r.groupId === submission.groupId);
  if (!groupRow) return null;
  const cap = assignment.maxMarks ?? 100;
  const subsByStudent = new Map(
    submissions
      .filter((s) => s.groupId === submission.groupId)
      .map((s) => [s.studentId, s] as const)
  );

  return (
    <div className='space-y-3'>
      {groupRow.members.map((member) => {
        const sub = subsByStudent.get(member.id);
        return (
          <div key={member.id} className='space-y-2 rounded-md border border-border/60 p-2.5'>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-medium'>{member.full_name}</p>
              <span className='text-xs text-muted-foreground'>{member.number}</span>
              {!sub ? (
                <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                  No submission
                </Badge>
              ) : null}
            </div>
            <div className='flex gap-2 items-center'>
              <Input
                type='number'
                min={0}
                max={cap}
                value={memberGrades.get(member.id) ?? ''}
                onChange={(e) =>
                  setMemberGrades((prev) => {
                    const next = new Map(prev);
                    next.set(member.id, e.target.value);
                    return next;
                  })
                }
                placeholder={`0-${cap}`}
                className='w-24 h-8 text-sm'
              />
              <Input
                value={memberFeedbacks.get(member.id) ?? ''}
                onChange={(e) =>
                  setMemberFeedbacks((prev) => {
                    const next = new Map(prev);
                    next.set(member.id, e.target.value);
                    return next;
                  })
                }
                placeholder='Feedback (optional)'
                className='flex-1 h-8 text-sm'
              />
            </div>
          </div>
        );
      })}
      {!hideSaveButton ? (
        <Button size='sm' onClick={onSave} disabled={gradePending}>
          {gradePending ? 'Saving…' : 'Save all grades'}
        </Button>
      ) : null}
    </div>
  );
}
