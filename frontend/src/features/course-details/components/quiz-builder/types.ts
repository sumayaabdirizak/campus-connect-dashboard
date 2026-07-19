import type {
  OptionInput,
  Quiz,
  QuizQuestion,
  QuizQuestionType
} from '../../api/quizzes-types';

export interface QuizBuilderProps {
  courseId: string;
  quiz: Quiz;
  onBack: () => void;
}

export interface DraftQuestion {
  id: number | null;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  correct_answer: string | null;
  explanation: string;
  options: OptionInput[];
}

export type { QuizQuestion, QuizQuestionType, OptionInput };
