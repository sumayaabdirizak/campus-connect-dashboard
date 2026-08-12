'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReportViolation, useSubmitQuiz } from '@/lib/course-details/queries/quizzes-queries';
import type { QuizAttempt, QuizAttemptAnswer } from '@/lib/course-details/services/quizzes-types';

export function useAttemptViolations(opts: {
  attemptId: number;
  quizId: number;
  initialWarnings: number;
  previewMode: boolean;
  answers: Record<number, QuizAttemptAnswer>;
  submitPending: boolean;
  onSubmitted: (attempt: QuizAttempt) => void;
}) {
  const {
    attemptId,
    quizId,
    initialWarnings,
    previewMode,
    answers,
    submitPending,
    onSubmitted
  } = opts;
  const violationMutation = useReportViolation();
  const submitMutation = useSubmitQuiz();

  const [maxWarnings, setMaxWarnings] = useState(3);
  const [warnings, setWarnings] = useState(initialWarnings);
  const [activeWarning, setActiveWarning] = useState<{
    kind: string;
    index: number;
  } | null>(null);
  const [autoClosed, setAutoClosed] = useState(false);
  const violationInFlightRef = useRef(false);
  const lastViolationAtRef = useRef(0);

  const reportViolation = (kind: string) => {
    if (previewMode || autoClosed) return;
    if (submitPending) return;
    if (violationInFlightRef.current) return;
    const now = Date.now();
    if (now - lastViolationAtRef.current < 2000) return;
    lastViolationAtRef.current = now;
    violationInFlightRef.current = true;
    violationMutation.mutate(
      { attemptId, kind },
      {
        onSuccess: (resp) => {
          violationInFlightRef.current = false;
          setWarnings(resp.warnings_shown);
          if (typeof resp.max_warnings === 'number' && resp.max_warnings > 0) {
            setMaxWarnings(resp.max_warnings);
          }
          if (resp.auto_closed) {
            setAutoClosed(true);
            setActiveWarning(null);
            return;
          }
          setActiveWarning({ kind, index: resp.warnings_shown });
        },
        onError: () => {
          violationInFlightRef.current = false;
          toast.warning(
            "Couldn't report monitoring event — will retry next time."
          );
        }
      }
    );
  };

  useEffect(() => {
    if (!autoClosed) return;
    submitMutation.mutate(
      { quizId, attemptId, answers: Object.values(answers) },
      { onSuccess: (a) => onSubmitted(a) }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClosed]);

  useEffect(() => {
    if (previewMode) return;
    const onVis = () => {
      if (document.hidden) reportViolation('visibility');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, autoClosed, submitPending]);

  useEffect(() => {
    if (previewMode) return;
    const onCopy = () => reportViolation('copy');
    const onPaste = () => reportViolation('paste');
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, autoClosed, submitPending]);

  useEffect(() => {
    if (previewMode) return;
    const onScreenshotKey = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen';
      const isMacFullScreen = e.metaKey && e.shiftKey && e.key === '3';
      const isMacSelection = e.metaKey && e.shiftKey && e.key === '4';
      const isMacToolbar = e.metaKey && e.shiftKey && e.key === '5';
      if (isPrintScreen || isMacFullScreen || isMacSelection || isMacToolbar) {
        e.preventDefault();
        reportViolation('screenshot');
      }
    };
    window.addEventListener('keydown', onScreenshotKey);
    return () => window.removeEventListener('keydown', onScreenshotKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, autoClosed, submitPending]);

  useEffect(() => {
    if (!activeWarning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setActiveWarning(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeWarning]);

  return {
    maxWarnings,
    warnings,
    activeWarning,
    setActiveWarning,
    autoClosed,
    finalizePending: submitMutation.isPending
  };
}
