import type { OptionInput } from '../../api/quizzes-types';
import type { DraftQuestion } from './types';
import { trueFalseOptions } from './draft-empty';

export function applyQuestionType(
  draft: DraftQuestion,
  type: DraftQuestion['question_type']
): DraftQuestion {
  if (type === 'TRUE_FALSE') {
    return { ...draft, question_type: type, options: trueFalseOptions() };
  }
  if (type === 'SHORT_ANSWER') {
    return { ...draft, question_type: type, options: [] };
  }
  return {
    ...draft,
    question_type: type,
    options:
      draft.options.length >= 2
        ? draft.options
        : [
            { option_text: '', is_correct: false, order_index: 0 },
            { option_text: '', is_correct: false, order_index: 1 }
          ]
  };
}

export function patchOption(
  draft: DraftQuestion,
  i: number,
  patch: Partial<OptionInput>
): DraftQuestion {
  return {
    ...draft,
    options: draft.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o))
  };
}

export function appendOption(draft: DraftQuestion): DraftQuestion {
  return {
    ...draft,
    options: [
      ...draft.options,
      { option_text: '', is_correct: false, order_index: draft.options.length }
    ]
  };
}

export function dropOption(
  draft: DraftQuestion,
  i: number
): { ok: true; draft: DraftQuestion } | { ok: false; error: string } {
  if (draft.options.length <= 2) {
    return { ok: false, error: 'Need at least 2 options' };
  }
  return {
    ok: true,
    draft: {
      ...draft,
      options: draft.options
        .filter((_, idx) => idx !== i)
        .map((o, idx) => ({ ...o, order_index: idx }))
    }
  };
}

export function markCorrectExclusive(draft: DraftQuestion, i: number): DraftQuestion {
  return {
    ...draft,
    options: draft.options.map((o, idx) => ({ ...o, is_correct: idx === i }))
  };
}
