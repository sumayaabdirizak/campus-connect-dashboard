'use client';

import { toast } from 'sonner';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';

type MutateLike = {
  mutate: (...args: any[]) => void;
  mutateAsync: (...args: any[]) => Promise<unknown>;
};

export function useBulkActions(args: {
  assignment: Assignment;
  submissionsByStudent: Map<number, Submission>;
  selectedRows: Set<number>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  bulkGradeValue: string;
  setBulkGradeValue: (v: string) => void;
  bulkGradeFeedback: string;
  setBulkGradeFeedback: (v: string) => void;
  setBulkGradeOpen: (v: boolean) => void;
  setBulkGradeRunning: (v: boolean) => void;
  bulkDate: string;
  setBulkDate: (v: string) => void;
  bulkReason: string;
  setBulkReason: (v: string) => void;
  setBulkOpen: (v: boolean) => void;
  gradeMutation: MutateLike;
  extensionBatchMutation: MutateLike;
}) {
  const a = args;
  const selectedAssignment = a.assignment;

  const handleBulkGrade = async () => {
    if (a.selectedRows.size === 0) return;
    const gradeNum = a.bulkGradeValue === '' ? undefined : Number(a.bulkGradeValue);
    const cap = selectedAssignment.maxMarks ?? 100;
    if (gradeNum != null && (Number.isNaN(gradeNum) || gradeNum < 0 || gradeNum > cap)) {
      toast.error(`Grade must be 0–${cap}`);
      return;
    }
    a.setBulkGradeRunning(true);
    try {
      const targets = Array.from(a.selectedRows)
        .map((sid) => a.submissionsByStudent.get(sid))
        .filter((s): s is Submission => s != null);
      const results = await Promise.allSettled(
        targets.map((sub) =>
          a.gradeMutation.mutateAsync({
            assignmentId: selectedAssignment.id,
            input: {
              submissionId: sub.id,
              grade: gradeNum,
              feedback: a.bulkGradeFeedback || undefined,
              is_reviewed: true
            }
          })
        )
      );
      const okCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - okCount;
      if (failCount === 0)
        toast.success(`Graded ${okCount} submission${okCount === 1 ? '' : 's'}`);
      else if (okCount === 0)
        toast.error(`Failed to grade ${failCount} submission${failCount === 1 ? '' : 's'}`);
      else toast.warning(`Graded ${okCount}, failed ${failCount}`);
      a.setBulkGradeOpen(false);
      a.setBulkGradeValue('');
      a.setBulkGradeFeedback('');
      a.setSelectedRows(new Set());
    } finally {
      a.setBulkGradeRunning(false);
    }
  };

  const handleBulkExtend = () => {
    if (!a.bulkDate || a.selectedRows.size === 0) {
      toast.error('Pick students and a new due date');
      return;
    }
    const newDueAt = new Date(a.bulkDate).toISOString();
    const reason = a.bulkReason || undefined;
    if (selectedAssignment.gradingScope === 'GROUP') {
      const groupIds = Array.from(
        new Set(
          Array.from(a.selectedRows)
            .map((sid) => a.submissionsByStudent.get(sid)?.groupId)
            .filter((g): g is number => typeof g === 'number')
        )
      );
      if (groupIds.length === 0) {
        toast.error('Selected submissions have no groupId');
        return;
      }
      a.extensionBatchMutation.mutate(
        { assignmentId: selectedAssignment.id, input: { groupIds, newDueAt, reason } },
        {
          onSuccess: ({ count }: { count: number }) => {
            toast.success(`Extension granted to ${count} group${count === 1 ? '' : 's'}`);
            a.setBulkOpen(false);
            a.setSelectedRows(new Set());
            a.setBulkDate('');
            a.setBulkReason('');
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
    } else {
      a.extensionBatchMutation.mutate(
        {
          assignmentId: selectedAssignment.id,
          input: { studentIds: Array.from(a.selectedRows), newDueAt, reason }
        },
        {
          onSuccess: ({ count }: { count: number }) => {
            toast.success(
              `Extension granted to ${count} student${count === 1 ? '' : 's'}`
            );
            a.setBulkOpen(false);
            a.setSelectedRows(new Set());
            a.setBulkDate('');
            a.setBulkReason('');
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
    }
  };

  return { handleBulkGrade, handleBulkExtend };
}
