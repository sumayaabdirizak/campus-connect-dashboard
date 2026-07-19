import type { CreateQuizInput, Quiz, UpdateQuizInput } from '../../api/quizzes-types';
import type { CourseModule } from '../../api/resources-types';

export interface QuizSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Quiz | null;
  pending: boolean;
  modules?: CourseModule[];
  onSubmit: (
    payload:
      | { mode: 'create'; data: CreateQuizInput }
      | { mode: 'edit'; quizId: number; data: UpdateQuizInput }
  ) => void;
}
