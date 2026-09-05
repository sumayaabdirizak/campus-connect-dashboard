'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import { useCreateQuiz } from '@/lib/course-details/queries/quizzes-queries';
import { uploadQuizPaperFile } from '@/lib/course-details/services/quizzes-service';
import { markBudgetKeys } from '@/lib/course-details/queries/mark-budget-queries';
import type { CourseMarkBudget } from '@/lib/course-details/services/mark-budget-service';
import {
  clampToMarkBudget,
  isMarkBudgetExhausted,
  MARK_BUDGET_FULL_MESSAGE
} from '@/lib/course-details/services/mark-budget-utils';
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
import { BLANK, toPayload, validateForm, isUploadedOfflineForm } from '../quiz-settings-form/form-state';

/// Drives the single-page "Add new quiz" flow: configure the quiz AND
/// stage its questions locally, then create everything in one request when
/// "Create Quiz" is pressed. Nothing is persisted until that final submit —
/// unlike the builder (which edits a quiz that already exists), staged
/// questions here are plain client-side state, reusing the same draft
/// helpers the builder uses for its own inline editor.
export function useNewQuizPage(courseId: string, onCreated: (quiz: Quiz) => void) {
  const [form, setForm] = useState(BLANK);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [draft, setDraft] = useState<DraftQuestion | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Tracks whether the open draft was started from a section's own "Add
  // Question" button, so the editor pins its Type field to that section —
  // same pattern as the real builder's quiz-builder.tsx.
  const [lockedAddType, setLockedAddType] = useState<QuizQuestionType | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [pendingPaperFile, setPendingPaperFile] = useState<File | null>(null);

  const createMutation = useCreateQuiz(courseId);
  const queryClient = useQueryClient();
  const createInFlightRef = useRef(false);

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

  /// Bulk-append from AI generation or CSV import. Each lands in whichever
  /// section its own question_type belongs to (or "Other questions") purely
  /// because the section blocks filter b.questions by type — no extra
  /// routing needed here.
  ///
  /// The per-section marks plan is enforced here too. The manual editor
  /// already caps its Points field at the section's remaining budget, but
  /// bulk adds used to bypass that entirely — a generated batch could push
  /// one section far past its target while another sat empty, and the
  /// "Total / Assigned" summary still read as balanced.
  const addQuestions = (newQuestions: DraftQuestion[]) => {
    if (selectedTypes.length === 0) {
      setQuestions((prev) => [...prev, ...newQuestions]);
      return;
    }

    const remaining = new Map<QuizQuestionType, number>();
    for (const type of selectedTypes) {
      const used = questions
        .filter((q) => q.question_type === type)
        .reduce((sum, q) => sum + (Number(q.points) || 0), 0);
      remaining.set(type, (allocations[type] ?? 0) - used);
    }

    const accepted: DraftQuestion[] = [];
    let skipped = 0;
    for (const q of newQuestions) {
      // A type with no section of its own is unplanned — it lands under
      // "Other questions", where no budget applies.
      if (!remaining.has(q.question_type)) {
        accepted.push(q);
        continue;
      }
      const points = Number(q.points) || 0;
      const left = remaining.get(q.question_type) ?? 0;
      if (points <= left) {
        accepted.push(q);
        remaining.set(q.question_type, left - points);
      } else {
        skipped += 1;
      }
    }

    if (accepted.length > 0) setQuestions((prev) => [...prev, ...accepted]);
    if (skipped > 0) {
      toast.warning(
        `${skipped} question${skipped === 1 ? '' : 's'} skipped — no marks left in ${skipped === 1 ? 'its' : 'their'} section. Raise the section's marks in Marking, or remove a question first.`
      );
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleCreate = async () => {
    if (createInFlightRef.current || createMutation.isPending) return;
    createInFlightRef.current = true;

    const uploaded = isUploadedOfflineForm(form);
    const err = validateForm(form, null);
    if (err) {
      toast.error(err);
      createInFlightRef.current = false;
      return;
    }
    if (uploaded && !pendingPaperFile) {
      toast.error('Upload the quiz document on the Marking tab first');
      createInFlightRef.current = false;
      return;
    }
    if (!uploaded && questions.length === 0) {
      toast.error('Add at least one question before creating the quiz');
      createInFlightRef.current = false;
      return;
    }
    const requested = form.marksPlanTotal;
    const budget = queryClient.getQueryData<CourseMarkBudget>(
      markBudgetKeys.offering(courseId)
    );
    if (budget && isMarkBudgetExhausted(budget, 0)) {
      toast.error(MARK_BUDGET_FULL_MESSAGE);
      createInFlightRef.current = false;
      return;
    }
    const marksPlanTotal =
      budget && requested > 0
        ? clampToMarkBudget(budget, requested, 0)
        : requested;
    const basePayload = toPayload({
      ...form,
      marksPlanTotal
    });
    const payload = uploaded
      ? basePayload
      : {
          ...basePayload,
          questions: questions.map(draftToPayload)
        };
    try {
      const quiz = await createMutation.mutateAsync(payload);
      const notice = (quiz as { markBudgetNotice?: string }).markBudgetNotice;
      if (notice) toast.info(notice);
      if (uploaded && pendingPaperFile) {
        try {
          await uploadQuizPaperFile(quiz.id, pendingPaperFile);
        } catch (uploadErr) {
          toast.error(
            `Quiz "${quiz.title}" was saved, but the file upload failed. Edit the quiz to upload the document again.`,
            { duration: 8000 }
          );
          onCreated(quiz);
          return;
        }
      }
      const published = !form.is_draft;
      toast.success(
        uploaded
          ? published
            ? `Published "${quiz.title}" — open Attempts to enter student marks`
            : `Saved "${quiz.title}" as draft — open Attempts to enter student marks`
          : published
            ? `Published "${quiz.title}" with ${questions.length} question${questions.length === 1 ? '' : 's'}`
            : `Saved "${quiz.title}" as draft with ${questions.length} question${questions.length === 1 ? '' : 's'}`
      );
      onCreated(quiz);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      createInFlightRef.current = false;
    }
  };

  return {
    form,
    setForm,
    questions,
    totalPoints,
    draft,
    editingIndex,
    lockedAddType,
    selectedTypes,
    allocations,
    aiOpen,
    setAiOpen,
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
    addQuestions,
    handleCreate,
    isCreating: createMutation.isPending,
    pendingPaperFile,
    setPendingPaperFile
  };
}
