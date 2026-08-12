'use client';

import { toast } from 'sonner';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { GroupRow } from './shared';

export type GradeMutateLike = {
  mutate: (...args: any[]) => void;
  mutateAsync: (...args: any[]) => Promise<unknown>;
};

export async function saveIndividualMemberGrades(opts: {
  assignment: Assignment;
  submissions: Submission[];
  allGroupRows: GroupRow[];
  selectedSubmission: Submission;
  memberGrades: Map<number, string>;
  memberFeedbacks: Map<number, string>;
  gradeMutation: GradeMutateLike;
  setDrawerOpen: (v: boolean) => void;
}) {
  const {
    assignment,
    submissions,
    allGroupRows,
    selectedSubmission,
    memberGrades,
    memberFeedbacks,
    gradeMutation,
    setDrawerOpen
  } = opts;
  if (!selectedSubmission.groupId) return;
  const cap = assignment.maxMarks ?? 100;
  const groupId = selectedSubmission.groupId;
  const groupRow = allGroupRows.find((r) => r.groupId === groupId);
  if (!groupRow) return;
  const subsByStudent = new Map(
    submissions
      .filter((s) => s.groupId === groupId)
      .map((s) => [s.studentId, s] as const)
  );
  for (const member of groupRow.members) {
    const val = memberGrades.get(member.id);
    if (val !== undefined && val !== '') {
      const g = Number(val);
      if (Number.isNaN(g) || g < 0 || g > cap) {
        toast.error(`Grade for ${member.full_name} must be 0–${cap}`);
        return;
      }
    }
  }
  const gradable = groupRow.members.filter((m) => subsByStudent.has(m.id));
  const skipped = groupRow.members.length - gradable.length;
  const results = await Promise.allSettled(
    gradable.map((member) => {
      const sub = subsByStudent.get(member.id)!;
      const val = memberGrades.get(member.id);
      return gradeMutation.mutateAsync({
        assignmentId: assignment.id,
        input: {
          submissionId: sub.id,
          grade: val === undefined || val === '' ? undefined : Number(val),
          feedback: memberFeedbacks.get(member.id) || undefined,
          is_reviewed: true
        }
      });
    })
  );
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) toast.error(`${failed} grade(s) failed to save`);
  else {
    toast.success(
      `Grades saved for ${results.length} member${results.length !== 1 ? 's' : ''}` +
        (skipped > 0 ? ` · ${skipped} skipped (no submission)` : '')
    );
    setDrawerOpen(false);
  }
}

export function grantAnotherChance(opts: {
  assignment: Assignment;
  selectedSubmission: Submission;
  extensionDate: string;
  extensionReason: string;
  extensionMutation: GradeMutateLike;
  extensionBatchMutation: GradeMutateLike;
  setDrawerOpen: (v: boolean) => void;
}) {
  const {
    assignment,
    selectedSubmission,
    extensionDate,
    extensionReason,
    extensionMutation,
    extensionBatchMutation,
    setDrawerOpen
  } = opts;
  if (!extensionDate) {
    toast.error('Pick a new due date');
    return;
  }
  const newDueAt = new Date(extensionDate).toISOString();
  const reason = extensionReason || undefined;
  if (assignment.gradingScope === 'GROUP' && selectedSubmission.groupId != null) {
    extensionMutation.mutate(
      {
        assignmentId: assignment.id,
        input: { groupId: selectedSubmission.groupId, newDueAt, reason }
      },
      {
        onSuccess: () => {
          toast.success('Another chance granted to the group');
          setDrawerOpen(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
    return;
  }
  extensionBatchMutation.mutate(
    {
      assignmentId: assignment.id,
      input: { studentIds: [selectedSubmission.studentId], newDueAt, reason }
    },
    {
      onSuccess: ({ count }: { count: number }) => {
        toast.success(
          `Another chance granted (${count} student${count === 1 ? '' : 's'})`
        );
        setDrawerOpen(false);
      },
      onError: (e: Error) => toast.error(e.message)
    }
  );
}
