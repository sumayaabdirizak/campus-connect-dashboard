import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';

export const AI_SECTION_TYPE_LABEL: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer'
};

/** One marking-plan section the AI should fill. */
export interface AiSectionPlanItem {
  type: QuizQuestionType;
  /** Marks allocated to this section in Marking. */
  marks: number;
  /** Marks still free after existing questions. */
  remainingMarks: number;
}

export function defaultCountForSection(remainingMarks: number): number {
  if (remainingMarks <= 0) return 0;
  // Prefer 1 mark per question when budget is small; otherwise up to 10.
  return Math.min(10, Math.max(1, Math.floor(remainingMarks)));
}

/**
 * Split `totalMarks` across `n` questions as evenly as possible.
 * Uses whole numbers when `n <= totalMarks`; otherwise 2-decimal fractions
 * (e.g. 5 marks ÷ 10 questions → 0.5 each) so the count the teacher asked
 * for is never silently capped by the marks budget.
 */
export function splitMarksAcrossQuestions(totalMarks: number, n: number): number[] {
  if (n <= 0) return [];
  const safeTotal = Math.max(0, totalMarks);
  if (safeTotal === 0) return Array.from({ length: n }, () => 0);

  // Integer split when every question can get at least 1 whole mark.
  if (Number.isInteger(safeTotal) && n <= safeTotal) {
    const base = Math.floor(safeTotal / n);
    const rem = safeTotal % n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
  }

  // Fractional split in hundredths so the sum equals totalMarks.
  const cents = Math.round(safeTotal * 100);
  const base = Math.floor(cents / n);
  const rem = cents % n;
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
}
