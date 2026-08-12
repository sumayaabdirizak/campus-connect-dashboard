import type { Quiz } from '@/lib/course-details/services/quizzes-types';

/// Three destinations the teacher can target with the generated questions:
///   - 'bank'     → save into the offering's Question Bank
///   - 'quiz'     → persist into the bank (teacher attaches via "Add from Bank")
///   - 'new-quiz' → create a brand-new DRAFT quiz seeded with kept questions
export type Destination =
  | { kind: 'bank' }
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
