import type { Quiz } from '@/lib/course-details/services/quizzes-types';

/// Two destinations the teacher can target with the generated questions:
///   - 'quiz'     → persist straight into that quiz's question list
///   - 'new-quiz' → create a brand-new DRAFT quiz seeded with kept questions
export type Destination =
  | { kind: 'quiz'; quizId: number }
  | { kind: 'new-quiz' };

export interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
  destination: Destination;
  /// Called after a `new-quiz` destination successfully creates the quiz.
  onQuizCreated?: (quiz: Quiz) => void;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
