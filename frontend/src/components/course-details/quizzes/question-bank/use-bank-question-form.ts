'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { BankQuestion, CreateBankQuestionInput } from '@/lib/course-details/types';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import {
  draftToPayload,
  fromBank,
  makeBlankDraft,
  type FormDraft,
  validateDraft
} from './form-draft';

export function useBankQuestionForm(
  initial: BankQuestion | null,
  onSubmit: (payload: CreateBankQuestionInput) => void
) {
  const initialId = initial?.id ?? 'new';
  const [draft, setDraft] = useState<FormDraft>(() =>
    initial ? fromBank(initial) : makeBlankDraft()
  );

  useEffect(() => {
    setDraft(initial ? fromBank(initial) : makeBlankDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  const isShortAnswer = draft.question_type === 'SHORT_ANSWER';

  const updateOption = (
    idx: number,
    patch: Partial<{ option_text: string; is_correct: boolean }>
  ) => {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    }));
  };

  const addOption = () => {
    if (draft.options.length >= 6) return;
    setDraft((d) => ({
      ...d,
      options: [...d.options, { option_text: '', is_correct: false }]
    }));
  };

  const removeOption = (idx: number) => {
    if (draft.options.length <= 2 && !isShortAnswer) return;
    setDraft((d) => ({ ...d, options: d.options.filter((_, i) => i !== idx) }));
  };

  const markSingleCorrect = (idx: number) => {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, i) => ({ ...o, is_correct: i === idx }))
    }));
  };

  const switchType = (next: QuizQuestionType) => {
    setDraft((d) => {
      if (next === 'TRUE_FALSE') {
        return {
          ...d,
          question_type: next,
          options: [
            { option_text: 'True', is_correct: d.options[0]?.is_correct ?? false },
            { option_text: 'False', is_correct: d.options[1]?.is_correct ?? false }
          ]
        };
      }
      if (next === 'SHORT_ANSWER') {
        return { ...d, question_type: next, options: [] };
      }
      const opts =
        d.options.length >= 2
          ? d.options
          : [
              ...d.options,
              ...Array(2 - d.options.length).fill({ option_text: '', is_correct: false })
            ];
      return { ...d, question_type: next, options: opts };
    });
  };

  const handleSubmit = () => {
    const err = validateDraft(draft);
    if (err) {
      toast.error(err);
      return;
    }
    onSubmit(draftToPayload(draft));
  };

  return {
    draft,
    setDraft,
    isShortAnswer,
    updateOption,
    addOption,
    removeOption,
    markSingleCorrect,
    switchType,
    handleSubmit
  };
}
