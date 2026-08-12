'use client';

import { useEffect, useRef, useState } from 'react';
import { QUIZ_API_BASE, readCsrfCookie } from '../course-quizzes-utils';
import type { QuizAttemptAnswer } from '@/lib/course-details/services/quizzes-types';
import { useQuizOfflineSave } from './use-quiz-offline-save';

export function useAttemptAutosave(opts: {
  attemptId: number;
  previewMode: boolean;
  savedAnswers: QuizAttemptAnswer[] | undefined;
}) {
  const { attemptId, previewMode, savedAnswers } = opts;

  const [answers, setAnswers] = useState<Record<number, QuizAttemptAnswer>>(
    () => {
      const seed: Record<number, QuizAttemptAnswer> = {};
      for (const a of savedAnswers ?? []) {
        seed[a.questionId] = {
          questionId: a.questionId,
          selected_option_id: a.selected_option_id ?? undefined,
          text_answer: a.text_answer ?? undefined,
          confidence: a.confidence ?? undefined
        };
      }
      return seed;
    }
  );
  const [dirty, setDirty] = useState(false);
  const liveStateRef = useRef({ answers, dirty });

  useEffect(() => {
    liveStateRef.current = { answers, dirty };
  }, [answers, dirty]);

  const offline = useQuizOfflineSave({
    attemptId,
    previewMode,
    answers,
    dirty,
    setDirty
  });

  useEffect(() => {
    if (previewMode) return;
    const handler = () => {
      const { answers: a, dirty: d } = liveStateRef.current;
      if (!d) return;
      try {
        const csrf = readCsrfCookie();
        fetch(`${QUIZ_API_BASE}/quiz-taking/attempts/${attemptId}/answers`, {
          method: 'PUT',
          keepalive: true,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrf ? { 'X-CSRF-Token': csrf } : {})
          },
          body: JSON.stringify({ answers: Object.values(a) })
        }).catch(() => {});
      } catch {
        /* never block unload */
      }
    };
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, [attemptId, previewMode]);

  useEffect(() => {
    if (previewMode) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty && Object.keys(answers).length === 0) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, answers, previewMode]);

  const updateAnswer = (
    questionId: number,
    patch: Partial<QuizAttemptAnswer>
  ) => {
    setAnswers((a) => {
      const prev = a[questionId] ?? { questionId };
      return { ...a, [questionId]: { ...prev, ...patch, questionId } };
    });
    setDirty(true);
  };

  return {
    answers,
    updateAnswer,
    dirty,
    liveStateRef,
    ...offline
  };
}
