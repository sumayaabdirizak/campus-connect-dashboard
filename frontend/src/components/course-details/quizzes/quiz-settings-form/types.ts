import type { CreateQuizInput, Quiz, UpdateQuizInput } from '@/lib/course-details/services/quizzes-types';

export interface QuizSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Quiz | null;
  pending: boolean;
  /** Used to block duplicate titles before submit. */
  existingQuizzes?: Array<{ id: number; title: string }>;
  onSubmit: (
    payload:
      | { mode: 'create'; data: CreateQuizInput }
      | { mode: 'edit'; quizId: number; data: UpdateQuizInput }
  ) => void;
}
