'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AUTOSAVE_DEBOUNCE_MS,
  QUIZ_API_BASE,
  readCsrfCookie
} from '../course-quizzes-utils';
import {
  drainPending,
  enqueueAnswers,
  getAllPending,
  requestBackgroundSync
} from '@/lib/course-details/queries/quiz-offline-queue';
import { useSaveAttemptAnswers } from '@/lib/course-details/queries/quizzes-queries';
import type { QuizAttemptAnswer } from '@/lib/course-details/services/quizzes-types';

export function useQuizOfflineSave(opts: {
  attemptId: number;
  previewMode: boolean;
  answers: Record<number, QuizAttemptAnswer>;
  dirty: boolean;
  setDirty: (v: boolean) => void;
}) {
  const { attemptId, previewMode, answers, dirty, setDirty } = opts;
  const saveMutation = useSaveAttemptAnswers();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveErrored, setSaveErrored] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [queuedCount, setQueuedCount] = useState(0);

  const refreshQueueCount = async () => {
    try {
      setQueuedCount((await getAllPending()).length);
    } catch {
      /* IDB unavailable */
    }
  };

  const queueOffline = async (payload: QuizAttemptAnswer[]) => {
    if (previewMode) return;
    try {
      await enqueueAnswers({
        attemptId,
        csrf: readCsrfCookie(),
        body: { answers: payload },
        url: `${QUIZ_API_BASE}/quiz-taking/attempts/${attemptId}/answers`,
        queuedAt: Date.now()
      });
      void requestBackgroundSync();
      void refreshQueueCount();
    } catch {
      /* private mode */
    }
  };

  const flushSave = (payload: QuizAttemptAnswer[]) => {
    if (previewMode) {
      setDirty(false);
      setLastSavedAt(Date.now());
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void queueOffline(payload);
      setSaveErrored(false);
      return;
    }
    saveMutation.mutate(
      { attemptId, answers: payload },
      {
        onSuccess: () => {
          setDirty(false);
          setSaveErrored(false);
          setLastSavedAt(Date.now());
        },
        onError: () => {
          void queueOffline(payload);
        }
      }
    );
  };

  useEffect(() => {
    if (previewMode) return;
    const onOnline = async () => {
      setIsOffline(false);
      const { failed } = await drainPending();
      await refreshQueueCount();
      if (failed === 0) {
        setSaveErrored(false);
        setLastSavedAt(Date.now());
      }
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    void (async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) await drainPending();
      await refreshQueueCount();
    })();
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'quiz-sync-progress') void refreshQueueCount();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, [previewMode]);

  useEffect(() => {
    if (!dirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave(Object.values(answers));
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, dirty]);

  return {
    isOffline,
    queuedCount,
    lastSavedAt,
    saveErrored,
    savePending: saveMutation.isPending,
    flushSave,
    saveTimerRef
  };
}
