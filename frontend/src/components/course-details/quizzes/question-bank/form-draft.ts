import type { BankQuestion, CreateBankQuestionInput } from '@/lib/course-details/types';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import { NO_MODULE } from './constants';

export interface FormDraft {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  topic: string;
  difficulty: '' | 'easy' | 'medium' | 'hard';
  moduleId: string; // NO_MODULE or numeric string
  options: Array<{ option_text: string; is_correct: boolean }>;
}

export function makeBlankDraft(): FormDraft {
  return {
    question_text: '',
    question_type: 'MCQ',
    points: 1,
    topic: '',
    difficulty: '',
    moduleId: NO_MODULE,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  };
}

export function fromBank(q: BankQuestion): FormDraft {
  return {
    question_text: q.question_text,
    question_type: q.question_type as QuizQuestionType,
    points: q.points,
    topic: q.topic ?? '',
    difficulty: q.difficulty ?? '',
    moduleId: q.moduleId == null ? NO_MODULE : String(q.moduleId),
    options: q.bankOptions.map((o) => ({
      option_text: o.option_text,
      is_correct: o.is_correct
    }))
  };
}

export function validateDraft(draft: FormDraft): string | null {
  const isShortAnswer = draft.question_type === 'SHORT_ANSWER';
  if (!draft.question_text.trim()) return 'Question text is required';
  if (draft.points <= 0) return 'Points must be greater than 0';
  if (!isShortAnswer) {
    const opts = draft.options.filter((o) => o.option_text.trim() !== '');
    if (opts.length < 2) return 'At least 2 options required';
    if (!opts.some((o) => o.is_correct)) return 'Mark at least one option as correct';
    if (draft.question_type === 'TRUE_FALSE' && opts.filter((o) => o.is_correct).length > 1) {
      return 'True/False allows only one correct option';
    }
  }
  return null;
}

export function draftToPayload(draft: FormDraft): CreateBankQuestionInput {
  const isShortAnswer = draft.question_type === 'SHORT_ANSWER';
  return {
    question_text: draft.question_text.trim(),
    question_type: draft.question_type,
    points: draft.points,
    topic: draft.topic.trim() || null,
    difficulty: (draft.difficulty || null) as 'easy' | 'medium' | 'hard' | null,
    moduleId: draft.moduleId === NO_MODULE ? null : Number(draft.moduleId),
    options: isShortAnswer
      ? undefined
      : draft.options
          .filter((o) => o.option_text.trim() !== '')
          .map((o, idx) => ({
            option_text: o.option_text.trim(),
            is_correct: o.is_correct,
            order_index: idx
          }))
  };
}
