'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { useSubmitQuiz } from '@/lib/course-details/queries/quizzes-queries';
import type { QuizAttempt, QuizStartResponse } from '@/lib/course-details/services/quizzes-types';
import { useAttemptAutosave } from './use-attempt-autosave';
import { useAttemptShortcuts } from './use-attempt-shortcuts';
import { useAttemptTimer } from './use-attempt-timer';
import { useAttemptViolations } from './use-attempt-violations';
import { useMultiTabGuard } from './use-multi-tab-guard';

export function useStudentAttemptController(
  data: QuizStartResponse,
  previewMode: boolean,
  onSubmitted: (attempt: QuizAttempt) => void
) {
  const submitMutation = useSubmitQuiz();
  const authUser = useAuthStore((s) => s.user);
  const watermarkLabel = `${authUser?.full_name ?? authUser?.name ?? authUser?.email ?? 'Student'} · #${data.attempt.id}`;
  const confidenceScoring = !!data.quiz?.confidence_scoring;

  const autosave = useAttemptAutosave({
    attemptId: data.attempt.id,
    previewMode,
    savedAnswers: data.savedAnswers
  });

  const handleSubmit = (auto = false) => {
    if (autosave.saveTimerRef.current) clearTimeout(autosave.saveTimerRef.current);
    submitMutation.mutate(
      {
        quizId: data.quiz.id,
        attemptId: data.attempt.id,
        answers: Object.values(autosave.answers)
      },
      {
        onSuccess: (a) => {
          if (auto) toast.message('Time up — submitted');
          onSubmitted(a);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const { remaining } = useAttemptTimer(data, previewMode, () => {
    if (!submitMutation.isPending) handleSubmit(true);
  });

  const multiTabConflict = useMultiTabGuard(data.attempt.id, previewMode);
  const violations = useAttemptViolations({
    attemptId: data.attempt.id,
    quizId: data.quiz.id,
    initialWarnings: data.attempt.warnings_shown ?? 0,
    previewMode,
    answers: autosave.answers,
    submitPending: submitMutation.isPending,
    onSubmitted
  });

  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);

  const navigateTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, data.questions.length - 1));
    if (autosave.saveTimerRef.current) clearTimeout(autosave.saveTimerRef.current);
    const { dirty: d, answers: a } = autosave.liveStateRef.current;
    if (d && !previewMode) autosave.flushSave(Object.values(a));
    const doNavigate = () => {
      setCurrentIdx(clamped);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(doNavigate);
    } else {
      doNavigate();
    }
  };

  useAttemptShortcuts({
    currentIdx,
    questions: data.questions,
    onToggleShortcuts: () => setShowShortcuts((v) => !v),
    onOpenSubmit: () => setConfirmingSubmit(true),
    onNext: () => navigateTo(currentIdx + 1),
    onPickOption: autosave.updateAnswer
  });

  const answeredCount = data.questions.reduce((n, q) => {
    const a = autosave.answers[q.id];
    const has =
      (a?.selected_option_id ?? null) !== null ||
      (a?.text_answer != null && a.text_answer.trim() !== '');
    return n + (has ? 1 : 0);
  }, 0);

  return {
    autosave,
    violations,
    remaining,
    multiTabConflict,
    watermarkLabel,
    confidenceScoring,
    confirmingSubmit,
    setConfirmingSubmit,
    showShortcuts,
    setShowShortcuts,
    currentIdx,
    acknowledged,
    setAcknowledged,
    navigateTo,
    handleSubmit,
    answeredCount,
    progressPct:
      data.questions.length > 0
        ? (answeredCount / data.questions.length) * 100
        : 0,
    submitPending: submitMutation.isPending,
    currentQuestion: data.questions[currentIdx]
  };
}
