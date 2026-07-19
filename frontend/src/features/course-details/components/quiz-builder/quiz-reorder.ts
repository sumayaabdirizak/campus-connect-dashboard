'use client';

import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { quizKeys } from '../../api/quizzes-queries';
import type { Quiz, QuizQuestion } from '../../api/quizzes-types';

type QueryClientLike = {
  getQueryData: <T>(key: unknown) => T | undefined;
  setQueryData: <T>(
    key: unknown,
    updater: T | ((old: T | undefined) => T)
  ) => void;
};

type ReorderMutate = {
  mutate: (
    vars: { quizId: number; items: { id: number; order_index: number }[] },
    opts?: { onError?: (e: Error) => void }
  ) => void;
};

export function createDragEndHandler(opts: {
  courseId: string;
  quizId: number;
  questions: QuizQuestion[];
  queryClient: QueryClientLike;
  reorderMutation: ReorderMutate;
}) {
  return (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = opts.questions.findIndex((q) => q.id === active.id);
    const newIndex = opts.questions.findIndex((q) => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(opts.questions, oldIndex, newIndex).map((q, i) => ({
      ...q,
      order_index: i
    }));

    const key = quizKeys.list(opts.courseId);
    const snapshot = opts.queryClient.getQueryData<Quiz[]>(key);
    opts.queryClient.setQueryData<Quiz[]>(key, (prev) =>
      (prev ?? []).map((q) =>
        q.id === opts.quizId ? { ...q, questions: reordered } : q
      )
    );

    opts.reorderMutation.mutate(
      {
        quizId: opts.quizId,
        items: reordered.map((q) => ({ id: q.id, order_index: q.order_index }))
      },
      {
        onError: (e: Error) => {
          if (snapshot) opts.queryClient.setQueryData<Quiz[]>(key, snapshot);
          toast.error(e.message || 'Reorder failed');
        }
      }
    );
  };
}
