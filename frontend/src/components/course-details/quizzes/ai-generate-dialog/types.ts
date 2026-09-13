import type { Quiz, QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import type { DraftQuestion } from '../quiz-builder/types';

/// Three destinations the teacher can target with the generated questions:
///   - 'quiz'     → persist straight into that quiz's question list
///   - 'new-quiz' → create a brand-new DRAFT quiz seeded with kept questions
///   - 'local'    → hand the kept questions back as staged DraftQuestion[]
///                  (no network call) — used by the single-page "Add new
///                  quiz" flow, which stages everything locally until the
///                  final "Create Quiz" submit.
export type Destination =
  | { kind: 'quiz'; quizId: number }
  | { kind: 'new-quiz' }
  | { kind: 'local' };

export interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
  destination: Destination;
  /// Called after a `new-quiz` destination successfully creates the quiz.
  onQuizCreated?: (quiz: Quiz) => void;
  /// Called with the kept questions for a `local` destination.
  onLocalAdd?: (questions: DraftQuestion[]) => void;
  /// When set, the Question types picker is hidden from the config form
  /// and generation is locked to exactly these types — used when the quiz
  /// already has a marks plan, so the teacher isn't asked to repeat config
  /// they already set on the Marks tab.
  lockedQuestionTypes?: QuizQuestionType[];
}
