'use client';

import { useState } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { useDeleteWithUndo } from '../../_shared/use-delete-with-undo';
import {
  deleteQuiz as deleteQuizCall,
  updateQuiz,
} from '@/lib/course-details/services/quizzes-service';
import {
  quizKeys,
  useCreateQuiz,
  useDuplicateQuiz,
  useUpdateQuiz,
} from '@/lib/course-details/queries/quizzes-queries';
import { markBudgetKeys } from '@/lib/course-details/queries/mark-budget-queries';
import { invalidateCourseOutcomeQueries } from '@/lib/course-details/queries/invalidate-course-outcomes';
import type { CourseMarkBudget } from '@/lib/course-details/services/mark-budget-service';
import {
  isMarkBudgetExhausted,
  resolveQuizRequestedCourseMarks
} from '@/lib/course-details/services/mark-budget-utils';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';

export function useTeacherQuizActions(courseId: string) {
  const createMutation = useCreateQuiz(courseId);
  const updateMutation = useUpdateQuiz(courseId);
  const duplicateMutation = useDuplicateQuiz(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (sorted: Quiz[]) => {
    setSelectedIds((prev) =>
      prev.size === sorted.length
        ? new Set()
        : new Set(sorted.map((q) => q.id))
    );
  };

  const togglePublish = (quiz: Quiz) => {
    const key = quizKeys.list(courseId);
    const nextDraft = !quiz.is_draft;
    if (!nextDraft && (quiz.questions?.length ?? 0) === 0) {
      toast.error('Add at least one question before publishing');
      return;
    }
    if (!nextDraft) {
      const budget = queryClient.getQueryData<CourseMarkBudget>(
        markBudgetKeys.offering(courseId)
      );
      const requested = resolveQuizRequestedCourseMarks(quiz);
      if (requested <= 0) {
        toast.error('Set course marks for this quiz before publishing');
        return;
      }
      if (budget && isMarkBudgetExhausted(budget, 0)) {
        toast.error('All course marks are allocated');
        return;
      }
    }
    const snapshot = queryClient.getQueryData<Quiz[]>(key);
    queryClient.setQueryData<Quiz[]>(key, (prev) =>
      (prev ?? []).map((q) => (q.id === quiz.id ? { ...q, is_draft: nextDraft } : q))
    );
    updateMutation.mutate(
      { quizId: quiz.id, input: { is_draft: nextDraft } },
      {
        onSuccess: (updated) => {
          const notice = (updated as { markBudgetNotice?: string }).markBudgetNotice;
          if (notice) toast.info(notice);
          toast.success(nextDraft ? 'Quiz unpublished' : 'Quiz published');
          queryClient.invalidateQueries({ queryKey: markBudgetKeys.offering(courseId) });
        },
        onError: (e: Error) => {
          if (snapshot) queryClient.setQueryData<Quiz[]>(key, snapshot);
          toast.error(e.message);
        },
      }
    );
  };

  const handleDuplicate = (quiz: Quiz) => {
    duplicateMutation.mutate(quiz.id, {
      onSuccess: () => toast.success(`Duplicated "${quiz.title}" as a draft`),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const runBulk = async (label: string, op: (id: number) => Promise<unknown>) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(ids.map(op));
    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;
    queryClient.invalidateQueries({ queryKey: quizKeys.list(courseId) });
    queryClient.invalidateQueries({ queryKey: quizKeys.available(courseId) });
    queryClient.invalidateQueries({ queryKey: markBudgetKeys.offering(courseId) });
    invalidateCourseOutcomeQueries(queryClient);
    if (failCount === 0) {
      toast.success(`${label} ${okCount} quiz${okCount === 1 ? '' : 'zes'}`);
    } else if (okCount === 0) {
      toast.error(`Failed to ${label.toLowerCase()} ${failCount} quiz${failCount === 1 ? '' : 'zes'}`);
    } else {
      toast.warning(`${label} ${okCount}, failed ${failCount}`);
    }
    clearSelection();
  };

  const handleBulkPublish = (draft: boolean) => {
    if (!draft) {
      const budget = queryClient.getQueryData<CourseMarkBudget>(
        markBudgetKeys.offering(courseId)
      );
      if (budget && isMarkBudgetExhausted(budget, 0)) {
        toast.error('All course marks are allocated');
        return;
      }
    }
    runBulk(draft ? 'Unpublished' : 'Published', (id) =>
      updateQuiz(id, { is_draft: draft })
    );
  };

  const handleBulkDelete = () => runBulk('Deleted', (id) => deleteQuizCall(id));

  const undoDeleteQuiz = (quiz: Quiz) => {
    const key = quizKeys.list(courseId);
    const snapshot = queryClient.getQueryData<Quiz[]>(key);
    if (!snapshot) return;
    runDelete({
      label: `Quiz deleted · "${quiz.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<Quiz[]>(key, (prev) =>
          (prev ?? []).filter((q) => q.id !== quiz.id)
        );
      },
      restore: () => queryClient.setQueryData<Quiz[]>(key, () => snapshot),
      commit: () => deleteQuizCall(quiz.id),
    });
  };

  return {
    createMutation,
    updateMutation,
    selectedIds,
    clearSelection,
    toggleSelect,
    toggleSelectAll,
    togglePublish,
    handleDuplicate,
    handleBulkPublish,
    handleBulkDelete,
    undoDeleteQuiz,
  };
}
