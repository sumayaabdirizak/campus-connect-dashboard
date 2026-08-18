'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateQuiz } from '@/lib/course-details/queries/quizzes-queries';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import {
  applyQuestionType,
  appendOption,
  dropOption,
  markCorrectExclusive,
  patchOption
} from '../quiz-builder/draft-options';
import { draftToPayload, emptyDraft, validateDraft } from '../quiz-builder/draft-empty';
import type { DraftQuestion, OptionInput, QuizQuestionType } from '../quiz-builder/types';
import { BLANK, toPayload, validateForm } from '../quiz-settings-form/form-state';

export type NewQuizPageTab = 'setup' | 'advanced';

/// Drives the single-page "Add new quiz" flow: configure the quiz AND
/// stage its questions locally, then create everything in one request when
/// "Create Quiz" is pressed. Nothing is persisted until that final submit —
/// unlike the builder (which edits a quiz that already exists), staged
/// questions here are plain client-side state, reusing the same draft
/// helpers the builder uses for its own inline editor.
export function useNewQuizPage(courseId: string, onCreated: (quiz: Quiz) => void) {
  const [form, setForm] = useState(BLANK);
  const [tab, setTab] = useState<NewQuizPageTab>('setup');
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [draft, setDraft] = useState<DraftQuestion | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Tracks whether the open draft was started from a section's own "Add
  // Question" button, so the editor pins its Type field to that section —
  // same pattern as the real builder's quiz-builder.tsx.
  const [lockedAddType, setLockedAddType] = useState<QuizQuestionType | null>(null);

  const createMutation = useCreateQuiz(courseId);

  const selectedTypes = form.marksPlanTypes;
  const allocations = form.marksPlanAllocations;

  const startNew = (type?: QuizQuestionType) => {
    setEditingIndex(null);
    setLockedAddType(null);
    setDraft(type ? applyQuestionType(emptyDraft(), type) : emptyDraft());
  };

  const startNewForSection = (type: QuizQuestionType) => {
    setEditingIndex(null);
    setLockedAddType(type);
    setDraft(applyQuestionType(emptyDraft(), type));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    const q = questions[index];
    setLockedAddType(selectedTypes.includes(q.question_type) ? q.question_type : null);
    setDraft({ ...q });
  };

  const cancelDraft = () => {
    setEditingIndex(null);
    setLockedAddType(null);
    setDraft(null);
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

  const saveDraft = () => {
    if (!draft) return;
    const err = validateDraft(draft);
    if (err) {
      toast.error(err);
      return;
    }
    if (editingIndex != null) {
      setQuestions((prev) => prev.map((q, i) => (i === editingIndex ? draft : q)));
    } else {
      setQuestions((prev) => [...prev, draft]);
    }
    cancelDraft();
  };

  const deleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleCreate = () => {
    const err = validateForm(form, null);
    if (err) {
      toast.error(err);
      return;
    }
    const payload = {
      ...toPayload(form),
      questions: questions.map(draftToPayload)
    };
    createMutation.mutate(payload, {
      onSuccess: (quiz) => {
        toast.success(
          `Created "${quiz.title}"${questions.length > 0 ? ` with ${questions.length} question${questions.length === 1 ? '' : 's'}` : ''}`
        );
        onCreated(quiz);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  return {
    form,
    setForm,
    tab,
    setTab,
    questions,
    totalPoints,
    draft,
    editingIndex,
    lockedAddType,
    selectedTypes,
    allocations,
    startNew,
    startNewForSection,
    startEdit,
    cancelDraft,
    setDraft,
    setType,
    updateOption,
    addOption,
    removeOption,
    setCorrectExclusive,
    saveDraft,
    deleteQuestion,
    handleCreate,
    isCreating: createMutation.isPending
  };
}
