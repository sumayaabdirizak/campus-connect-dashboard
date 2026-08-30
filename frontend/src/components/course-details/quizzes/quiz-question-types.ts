import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import type { FormState } from './quiz-settings-form/form-state';

export type QuizDeliveryMode = 'online' | 'offline';

const ONLINE_TYPES: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE'];
const OFFLINE_TYPES: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'];

export const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer'
};

export function questionTypesForMode(mode: QuizDeliveryMode): QuizQuestionType[] {
  return mode === 'offline' ? OFFLINE_TYPES : ONLINE_TYPES;
}

export function isQuestionTypeAllowedForMode(
  mode: QuizDeliveryMode,
  type: QuizQuestionType
): boolean {
  return questionTypesForMode(mode).includes(type);
}

/** Drop short-answer from the marks plan when switching to an online quiz. */
export function formWithoutOnlineDisallowedTypes(form: FormState): FormState {
  if (form.mode !== 'online') return form;
  const allowed = new Set(questionTypesForMode('online'));
  const marksPlanTypes = form.marksPlanTypes.filter((t) => allowed.has(t));
  const marksPlanAllocations = { ...form.marksPlanAllocations };
  delete marksPlanAllocations.SHORT_ANSWER;
  return { ...form, marksPlanTypes, marksPlanAllocations };
}
