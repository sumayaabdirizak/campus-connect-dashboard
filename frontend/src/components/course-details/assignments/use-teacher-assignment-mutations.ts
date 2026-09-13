'use client';

import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import { useDeleteWithUndo } from '../_shared/use-delete-with-undo';
import {
  deleteAssignment as deleteAssignmentCall,
  updateAssignment as updateAssignmentCall
} from '@/lib/course-details/services/assignments-service';
import {
  assignmentKeys,
  useUpdateAssignment
} from '@/lib/course-details/queries/assignments-queries';
import { markBudgetKeys } from '@/lib/course-details/queries/mark-budget-queries';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import type { AssignmentFormValues } from './create-assignment-form';
import {
  duplicateAssignmentTitleMessage,
  isDuplicateCourseTitle
} from '@/lib/course-details/validate-unique-title';

type MutateSetters = {
  courseId: string;
  selectedAssignmentIds: Set<number>;
  editTarget: Assignment | null;
  setEditTarget: (v: Assignment | null) => void;
  setSelectedAssignment: (v: Assignment | null) => void;
  setView: (v: 'list' | 'submissions') => void;
  clearAssignmentSelection: () => void;
};

export function useTeacherAssignmentMutations(s: MutateSetters) {
  const updateAssignmentMutation = useUpdateAssignment(s.courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const togglePublish = (assignment: Assignment) => {
    const key = assignmentKeys.list(s.courseId);
    const nextDraft = !assignment.is_draft;
    const snapshot = queryClient.getQueryData<Assignment[]>(key);
    queryClient.setQueryData<Assignment[]>(key, (prev) =>
      (prev ?? []).map((a) => (a.id === assignment.id ? { ...a, is_draft: nextDraft } : a))
    );
    updateAssignmentMutation.mutate(
      { id: assignment.id, input: { is_draft: nextDraft } },
      {
        onSuccess: (data) => {
          const notice = (data as { markBudgetNotice?: string }).markBudgetNotice;
          if (notice) toast.info(notice);
          toast.success(nextDraft ? 'Assignment unpublished' : 'Assignment published');
          queryClient.invalidateQueries({ queryKey: markBudgetKeys.offering(s.courseId) });
        },
        onError: (e: Error) => {
          if (snapshot) queryClient.setQueryData<Assignment[]>(key, snapshot);
          toast.error(e.message);
        }
      }
    );
  };

  const runAssignmentBulk = async (
    label: string,
    op: (id: number) => Promise<unknown>
  ) => {
    const ids = Array.from(s.selectedAssignmentIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(ids.map(op));
    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;
    queryClient.invalidateQueries({ queryKey: assignmentKeys.list(s.courseId) });
    queryClient.invalidateQueries({ queryKey: markBudgetKeys.offering(s.courseId) });
    if (failCount === 0) {
      toast.success(`${label} ${okCount} assignment${okCount === 1 ? '' : 's'}`);
    } else if (okCount === 0) {
      toast.error(
        `Failed to ${label.toLowerCase()} ${failCount} assignment${failCount === 1 ? '' : 's'}`
      );
    } else {
      toast.warning(`${label} ${okCount}, failed ${failCount}`);
    }
    s.clearAssignmentSelection();
  };

  const handleBulkPublishAssignments = (draft: boolean) => {
    runAssignmentBulk(draft ? 'Unpublished' : 'Published', (id) =>
      updateAssignmentCall(id, { is_draft: draft })
    );
  };
  const handleBulkDeleteAssignments = () =>
    runAssignmentBulk('Deleted', (id) => deleteAssignmentCall(id));

  const handleDelete = (id: number) => {
    const key = assignmentKeys.list(s.courseId);
    const snapshot = queryClient.getQueryData<Assignment[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((a) => a.id === id);
    if (!removed) return;
    runDelete({
      label: `Assignment deleted · "${removed.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<Assignment[]>(key, (prev) =>
          (prev ?? []).filter((a) => a.id !== id)
        );
      },
      restore: () => queryClient.setQueryData<Assignment[]>(key, () => snapshot),
      commit: () => deleteAssignmentCall(id)
    });
  };

  const openSubmissions = (assignment: Assignment) => {
    s.setSelectedAssignment(assignment);
    s.setView('submissions');
  };

  const handleEditAssignment = async (values: AssignmentFormValues) => {
    if (!s.editTarget) return;
    const existing =
      queryClient.getQueryData<Assignment[]>(assignmentKeys.list(s.courseId)) ?? [];
    if (isDuplicateCourseTitle(values.title, existing, s.editTarget.id)) {
      toast.error(duplicateAssignmentTitleMessage(values.title));
      return;
    }
    try {
      const updated = await updateAssignmentMutation.mutateAsync({
        id: s.editTarget.id,
        input: {
          title: values.title,
          description: values.description || undefined,
          open_at: values.open_at ? new Date(values.open_at).toISOString() : null,
          due_date: new Date(values.due_date).toISOString(),
          workMode: values.workMode,
          gradingScope: values.gradingScope,
          lateWindowMinutes: values.allowLate ? -1 : 0,
          maxMarks: values.maxMarks
        }
      });
      const notice = (updated as { markBudgetNotice?: string }).markBudgetNotice;
      if (notice) toast.info(notice);
      toast.success('Assignment updated');
      queryClient.invalidateQueries({ queryKey: markBudgetKeys.offering(s.courseId) });
      s.setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return {
    togglePublish,
    handleBulkPublishAssignments,
    handleBulkDeleteAssignments,
    handleDelete,
    openSubmissions,
    handleEditAssignment,
    updatePending: updateAssignmentMutation.isPending
  };
}
