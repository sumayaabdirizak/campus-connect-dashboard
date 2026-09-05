'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import { useUpdateQuiz } from '@/lib/course-details/queries/quizzes-queries';
import { markBudgetKeys } from '@/lib/course-details/queries/mark-budget-queries';
import { quizKeys } from '@/lib/course-details/queries/quizzes-queries/keys';
import type { CourseMarkBudget } from '@/lib/course-details/services/mark-budget-service';
import {
  clampToMarkBudget,
  isMarkBudgetExhausted,
  MARK_BUDGET_FULL_MESSAGE
} from '@/lib/course-details/services/mark-budget-utils';
import type { Quiz, QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import { emptyDraft } from '../quiz-builder/draft-empty';
import { useQuizBuilder } from '../quiz-builder/use-quiz-builder';
import {
  fromQuiz,
  toPayload,
  validateForm,
  isUploadedOfflineForm,
  type FormState
} from '../quiz-settings-form/form-state';
import { isUploadedOfflineQuiz } from '@/lib/course-details/services/quiz-total-points';
import {
  deleteQuizPaperFile,
  uploadQuizPaperFile
} from '@/lib/course-details/services/quizzes-service';

/// Full-page edit flow: quiz configuration (Basics / Timing / Marking) lives in
/// local form state while questions are persisted immediately via the same
/// mutations the old QuizBuilder used. "Save quiz" writes config only.
export function useEditQuizPage(
  courseId: string,
  quiz: Quiz,
  onSaved?: () => void
) {
  const [form, setForm] = useState(() => fromQuiz(quiz));
  const [lockedAddType, setLockedAddType] = useState<QuizQuestionType | null>(null);
  const [pendingPaperFile, setPendingPaperFile] = useState<File | null>(null);
  const [removingPaperFile, setRemovingPaperFile] = useState(false);
  const marksPlanTouchedRef = useRef(false);

  const b = useQuizBuilder(courseId, quiz);
  const updateMutation = useUpdateQuiz(courseId);
  const queryClient = useQueryClient();

  useEffect(() => {
    setForm(fromQuiz(quiz));
    setLockedAddType(null);
    setPendingPaperFile(null);
    marksPlanTouchedRef.current = false;
    b.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id]);

  const questionMarksFingerprint = useMemo(
    () =>
      (quiz.questions ?? [])
        .map((q) => `${q.id}:${q.question_type}:${q.points}`)
        .join('|'),
    [quiz.questions]
  );

  // Re-infer marks only while the teacher hasn't edited Marking and nothing
  // is saved yet — keyed on question content, not the whole live quiz object.
  useEffect(() => {
    if (quiz.marksPlan || marksPlanTouchedRef.current) return;
    setForm((prev) => {
      const fresh = fromQuiz(quiz);
      return {
        ...prev,
        marksPlanTotal: fresh.marksPlanTotal,
        marksPlanTypes: fresh.marksPlanTypes,
        marksPlanAllocations: fresh.marksPlanAllocations
      };
    });
  }, [questionMarksFingerprint, quiz.marksPlan]);

  const setMarksForm = useCallback(
    (next: FormState | ((prev: FormState) => FormState)) => {
      marksPlanTouchedRef.current = true;
      setForm(next);
    },
    []
  );

  const selectedTypes = form.marksPlanTypes;
  const allocations = form.marksPlanAllocations;

  const editingIndex = useMemo(() => {
    if (b.draft?.id == null) return null;
    return b.questions.findIndex((q) => q.id === b.draft!.id);
  }, [b.draft, b.questions]);

  const questionDrafts = useMemo(
    () => b.questions.map((q) => emptyDraft(q)),
    [b.questions]
  );

  const totalPoints = b.totalPoints;

  const startNew = () => {
    setLockedAddType(null);
    b.startNew();
  };

  const startNewForSection = (type: QuizQuestionType) => {
    setLockedAddType(type);
    b.startNew(type);
  };

  const startEdit = (index: number) => {
    const q = b.questions[index];
    if (!q) return;
    setLockedAddType(selectedTypes.includes(q.question_type) ? q.question_type : null);
    b.startEdit(q);
  };

  const cancelDraft = () => {
    setLockedAddType(null);
    b.cancel();
  };

  const saveDraft = () => b.save();

  const deleteQuestion = (index: number) => {
    const q = b.questions[index];
    if (q) b.handleDelete(q);
  };

  const handleSave = () => {
    if (b.draft != null) {
      toast.error('Finish editing the open question first');
      return;
    }
    const err = validateForm(form, quiz);
    if (err) {
      toast.error(err);
      return;
    }
    if (!form.is_draft) {
      const budget = queryClient.getQueryData<CourseMarkBudget>(
        markBudgetKeys.offering(courseId)
      );
      const requested = form.marksPlanTotal;
      const excludePublished = quiz.is_draft ? 0 : quiz.maxMarks ?? requested;
      if (budget && quiz.is_draft && isMarkBudgetExhausted(budget, excludePublished)) {
        toast.error(MARK_BUDGET_FULL_MESSAGE);
        return;
      }
    }
    let payloadForm = form;
    if (!form.is_draft) {
      const budget = queryClient.getQueryData<CourseMarkBudget>(
        markBudgetKeys.offering(courseId)
      );
      const requested = form.marksPlanTotal;
      const excludePublished = quiz.is_draft ? 0 : quiz.maxMarks ?? requested;
      if (budget && requested > 0) {
        const clamped = clampToMarkBudget(budget, requested, excludePublished);
        if (clamped !== requested) {
          payloadForm = { ...form, marksPlanTotal: clamped };
          toast.info(`Course marks reduced to ${clamped} to fit the remaining budget.`);
        }
      }
    }
    updateMutation.mutate(
      { quizId: quiz.id, input: toPayload(payloadForm) },
      {
        onSuccess: async (updated) => {
          const notice = (updated as { markBudgetNotice?: string }).markBudgetNotice;
          if (notice) toast.info(notice);
          try {
            if (pendingPaperFile && isUploadedOfflineForm(form)) {
              await uploadQuizPaperFile(quiz.id, pendingPaperFile);
              setPendingPaperFile(null);
            }
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : 'Quiz saved but file upload failed'
            );
            return;
          }
          toast.success(`Saved "${form.title.trim() || quiz.title}"`);
          queryClient.invalidateQueries({ queryKey: markBudgetKeys.offering(courseId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseId) });
          onSaved?.();
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const removePaperFile = async () => {
    if (!quiz.paperFile) return;
    setRemovingPaperFile(true);
    try {
      await deleteQuizPaperFile(quiz.id);
      toast.success('Quiz file removed');
      queryClient.invalidateQueries({ queryKey: markBudgetKeys.offering(courseId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseId) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove file');
    } finally {
      setRemovingPaperFile(false);
    }
  };

  const isSaving =
    updateMutation.isPending ||
    b.createMutation.isPending ||
    b.updateMutation.isPending;

  return {
    form,
    setForm,
    setMarksForm,
    quiz,
    questions: b.questions,
    questionDrafts,
    totalPoints,
    selectedTypes,
    allocations,
    draft: b.draft,
    setDraft: b.setDraft,
    editingIndex,
    lockedAddType,
    canAddQuestions: b.canAddQuestions,
    addLockedTitle: b.addLockedTitle,
    setType: b.setType,
    updateOption: b.updateOption,
    addOption: b.addOption,
    removeOption: b.removeOption,
    setCorrectExclusive: b.setCorrectExclusive,
    startNew,
    startNewForSection,
    startEdit,
    cancelDraft,
    saveDraft,
    deleteQuestion,
    handleSave,
    isSaving,
    pendingPaperFile,
    setPendingPaperFile,
    removePaperFile,
    removingPaperFile,
    isUploadedPaper: isUploadedOfflineQuiz(quiz),
    questionSavePending: b.createMutation.isPending || b.updateMutation.isPending,
    deletePending: b.deleteMutation.isPending
  };
}
