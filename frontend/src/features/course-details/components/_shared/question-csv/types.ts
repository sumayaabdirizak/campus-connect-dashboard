import type { QuizQuestionType } from '../../../api/quizzes-types';

export interface ParsedQuestionRow {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  explanation: string | null;
  options: Array<{ option_text: string; is_correct: boolean; order_index: number }>;
}

export interface ParseResult {
  rows: ParsedQuestionRow[];
  errors: Array<{ rowIndex: number; reason: string }>;
}
