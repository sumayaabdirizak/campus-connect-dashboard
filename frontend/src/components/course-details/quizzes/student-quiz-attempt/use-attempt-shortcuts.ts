'use client';

import { useEffect } from 'react';
import type { QuizAttemptAnswer, QuizStartResponse } from '@/lib/course-details/services/quizzes-types';

export function useAttemptShortcuts(opts: {
  currentIdx: number;
  questions: QuizStartResponse['questions'];
  onToggleShortcuts: () => void;
  onOpenSubmit: () => void;
  onNext: () => void;
  onPickOption: (questionId: number, patch: Partial<QuizAttemptAnswer>) => void;
}) {
  const {
    currentIdx,
    questions,
    onToggleShortcuts,
    onOpenSubmit,
    onNext,
    onPickOption
  } = opts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.isContentEditable);
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        onToggleShortcuts();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onOpenSubmit();
        return;
      }
      if (isTyping) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        onNext();
        return;
      }
      const num = parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= 9) {
        const q = questions[currentIdx];
        if (q && q.question_type !== 'SHORT_ANSWER') {
          const opt = q.options[num - 1];
          if (opt) {
            e.preventDefault();
            onPickOption(q.id, {
              selected_option_id: opt.id,
              text_answer: null
            });
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, questions]);
}
