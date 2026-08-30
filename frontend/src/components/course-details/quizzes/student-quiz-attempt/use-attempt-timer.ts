'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { QuizStartResponse } from '@/lib/course-details/services/quizzes-types';
import { serverNow, syncServerTime } from '@/lib/server-clock';

export function useAttemptTimer(
  data: QuizStartResponse,
  previewMode: boolean,
  onTimeUp: () => void
) {
  useEffect(() => {
    if (data.serverTime) syncServerTime(data.serverTime);
  }, [data.serverTime]);

  const expiresAtMs = data.attempt.expires_at
    ? new Date(data.attempt.expires_at).getTime()
    : serverNow() + data.quiz.duration_minutes * 60_000;

  const computeRemaining = () =>
    Math.max(0, Math.floor((expiresAtMs - serverNow()) / 1000));
  const [remaining, setRemaining] = useState(computeRemaining);
  const lastWarnedRef = useRef({ five: false, one: false });
  const firedTimeUpRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setRemaining(computeRemaining()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (previewMode) return;
    if (remaining === 0 && !firedTimeUpRef.current) {
      firedTimeUpRef.current = true;
      onTimeUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, previewMode]);

  useEffect(() => {
    if (previewMode) return;
    if (
      !lastWarnedRef.current.five &&
      remaining > 0 &&
      remaining <= 300 &&
      expiresAtMs - new Date(data.attempt.started_at).getTime() > 5 * 60_000
    ) {
      lastWarnedRef.current.five = true;
      toast.warning('5 minutes remaining', {
        description: 'Wrap up — answers autosave as you go.'
      });
    }
    if (!lastWarnedRef.current.one && remaining > 0 && remaining <= 60) {
      lastWarnedRef.current.one = true;
      toast.error('1 minute remaining', {
        description: 'Your attempt will auto-submit when the timer hits zero.',
        duration: 8000
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, previewMode]);

  return { remaining };
}
