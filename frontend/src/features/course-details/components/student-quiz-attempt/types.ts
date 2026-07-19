import type { QuizAttempt, QuizStartResponse } from '../../api/quizzes-types';

export type StudentAttemptProps = {
  data: QuizStartResponse;
  /** Receives the finalized attempt so the parent can swap in review. */
  onSubmitted: (attempt: QuizAttempt) => void;
  /** Programmatic exit (e.g. teacher preview close). */
  onBack?: () => void;
  /** Teacher preview: no autosave / submit / multi-tab / timer warnings. */
  previewMode?: boolean;
  onClosePreview?: () => void;
};
