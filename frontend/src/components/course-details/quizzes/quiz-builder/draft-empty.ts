import type { OptionInput, QuizQuestion } from '@/lib/course-details/services/quizzes-types';
import type { DraftQuestion } from './types';

export const emptyDraft = (existing?: QuizQuestion): DraftQuestion => {
  if (existing) {
    return {
      id: existing.id,
      question_text: existing.question_text,
      question_type: existing.question_type,
      points: existing.points,
      correct_answer: '',
      explanation: existing.explanation ?? '',
      options: existing.options.map((o, i) => ({
        option_text: o.option_text,
        is_correct: !!o.is_correct,
        order_index: o.order_index ?? i
      }))
    };
  }
  return {
    id: null,
    question_text: '',
    question_type: 'MCQ',
    points: 1,
    correct_answer: null,
    explanation: '',
    options: [
      { option_text: '', is_correct: false, order_index: 0 },
      { option_text: '', is_correct: false, order_index: 1 }
    ]
  };
};

export const trueFalseOptions = (): OptionInput[] => [
  { option_text: 'True', is_correct: false, order_index: 0 },
  { option_text: 'False', is_correct: false, order_index: 1 }
];

export function validateDraft(draft: DraftQuestion | null): string | null {
  if (!draft) return 'No draft';
  if (!draft.question_text.trim()) return 'Question text is required';
  if (draft.points <= 0) return 'Points must be greater than zero';
  if (draft.question_type === 'MCQ' || draft.question_type === 'TRUE_FALSE') {
    const filled = draft.options.filter((o) => o.option_text.trim());
    if (filled.length < 2) return 'Need at least 2 non-empty options';
    const correct = draft.options.filter((o) => o.is_correct).length;
    if (correct === 0) return 'Mark exactly one option as correct';
    if (correct > 1 && draft.question_type === 'TRUE_FALSE') {
      return 'Only one True/False answer can be correct';
    }
  }
  return null;
}

export function draftToPayload(draft: DraftQuestion) {
  return {
    question_text: draft.question_text.trim(),
    question_type: draft.question_type,
    points: Number(draft.points) || 1,
    correct_answer: draft.correct_answer ?? null,
    explanation: draft.explanation.trim() || null,
    options:
      draft.question_type === 'SHORT_ANSWER'
        ? []
        : draft.options
            .filter((o) => o.option_text.trim())
            .map((o, idx) => ({ ...o, order_index: idx }))
  };
}
