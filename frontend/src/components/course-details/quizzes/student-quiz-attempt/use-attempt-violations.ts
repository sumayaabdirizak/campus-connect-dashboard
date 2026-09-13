'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReportViolation, useSubmitQuiz } from '@/lib/course-details/queries/quizzes-queries';
import type { QuizAttempt, QuizAttemptAnswer } from '@/lib/course-details/services/quizzes-types';

function isScreenshotShortcut(e: KeyboardEvent): boolean {
  const key = e.key;
  const code = e.code;
  if (key === 'PrintScreen' || code === 'PrintScreen') return true;
  // macOS screenshot shortcuts
  if (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5')) {
    return true;
  }
  // Win+Shift+S (Snipping Tool) — Win is metaKey in Chromium on Windows
  if (e.metaKey && e.shiftKey && (key === 's' || key === 'S')) return true;
  // Common overlay / extension shortcuts
  if (e.ctrlKey && e.shiftKey && (key === 's' || key === 'S')) return true;
  return false;
}

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

  // Tab switch / leave quiz window (visibility + focus loss to another app)
  useEffect(() => {
    if (previewMode) return;
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const onVis = () => {
      if (document.hidden) reportViolation('visibility');
    };

    const onBlur = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        // Visibility already covers hidden tabs; blur catches Alt-Tab / other apps.
        if (!document.hasFocus()) {
          reportViolation('visibility');
        }
      }, 200);
    };

    const onFocus = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      if (blurTimer) clearTimeout(blurTimer);
    };
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

  // Screenshot shortcuts (PrintScreen fires on keyup on many Windows browsers)
  useEffect(() => {
    if (previewMode) return;
    const onScreenshotKey = (e: KeyboardEvent) => {
      if (!isScreenshotShortcut(e)) return;
      e.preventDefault();
      reportViolation('screenshot');
    };
    window.addEventListener('keydown', onScreenshotKey, true);
    window.addEventListener('keyup', onScreenshotKey, true);
    return () => {
      window.removeEventListener('keydown', onScreenshotKey, true);
      window.removeEventListener('keyup', onScreenshotKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, autoClosed, submitPending]);

  // Soften screenshot / save-as via context menu during the attempt
  useEffect(() => {
    if (previewMode) return;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [previewMode]);

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
