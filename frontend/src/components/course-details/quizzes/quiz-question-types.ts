import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';

export type QuizDeliveryMode = 'online' | 'offline';

const ONLINE_TYPES: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'];
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
