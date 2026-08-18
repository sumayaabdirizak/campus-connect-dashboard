'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import {
  useCreateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  useUpdateQuestion
} from '@/lib/course-details/queries/quizzes-queries';
import type { OptionInput, Quiz, QuizQuestion, QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import { emptyDraft } from './draft-empty';
import {
  appendOption,
  applyQuestionType,
  dropOption,
  markCorrectExclusive,
  patchOption
} from './draft-options';
import { deleteQuizQuestion, saveDraftQuestion } from './quiz-builder-actions';
import { createDragEndHandler } from './quiz-reorder';
import type { DraftQuestion } from './types';

const ADD_LOCKED =
  'This quiz is published. Switch it back to draft on the Quizzes list before adding questions.';

export function useQuizBuilder(courseId: string, quiz: Quiz) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftQuestion | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const createMutation = useCreateQuestion(courseId, quiz.id);
  const updateMutation = useUpdateQuestion(courseId);
  const deleteMutation = useDeleteQuestion(courseId);
  const reorderMutation = useReorderQuestions(courseId);

  const questions = useMemo(
    () =>
      [...(quiz.questions ?? [])].sort((a, b) => a.order_index - b.order_index),
    [quiz.questions]
  );
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const canAddQuestions = quiz.is_draft;

  const handleDragEnd = createDragEndHandler({
    courseId,
    quizId: quiz.id,
    questions,
    queryClient,
    reorderMutation
  });

  const startNew = (type?: QuizQuestionType) => {
    if (!canAddQuestions) {
      toast.error(ADD_LOCKED);
      return;
    }
    setDraft(type ? applyQuestionType(emptyDraft(), type) : emptyDraft());
  };

  const setType = (type: QuizQuestionType) => {
    if (draft) setDraft(applyQuestionType(draft, type));
  };

  const updateOption = (i: number, patch: Partial<OptionInput>) => {
    if (draft) setDraft(patchOption(draft, i, patch));
  };

  const addOption = () => {
    if (draft) setDraft(appendOption(draft));
  };

  const removeOption = (i: number) => {
    if (!draft) return;
    const result = dropOption(draft, i);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDraft(result.draft);
  };

  const setCorrectExclusive = (i: number) => {
    if (draft) setDraft(markCorrectExclusive(draft, i));
  };

  return {
    draft,
    setDraft,
    aiOpen,
    setAiOpen,
    csvOpen,
    setCsvOpen,
    questions,
    totalPoints,
    canAddQuestions,
    addLockedTitle: ADD_LOCKED,
    createMutation,
    updateMutation,
    deleteMutation,
    handleDragEnd,
    startNew,
    startEdit: (q: QuizQuestion) => setDraft(emptyDraft(q)),
    cancel: () => setDraft(null),
    setType,
    updateOption,
    addOption,
    removeOption,
    setCorrectExclusive,
    save: () =>
      saveDraftQuestion({
        draft,
        canAddQuestions,
        addLockedTitle: ADD_LOCKED,
        createMutation,
        updateMutation,
        clearDraft: () => setDraft(null)
      }),
    handleDelete: (q: QuizQuestion) => deleteQuizQuestion(q, deleteMutation)
  };
}
