import type { GeneratedQuestion } from '@/lib/course-details/types';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  QuizQuestionType
} from '@/lib/course-details/services/quizzes-types';
import type { DraftQuestion } from '../quiz-builder/types';

function mapQuestion(q: GeneratedQuestion): CreateQuestionInput {
  return {
    question_text: q.question_text,
    question_type: q.question_type as QuizQuestionType,
    points: q.points,
    explanation: q.explanation || null,
    options:
      q.question_type === 'SHORT_ANSWER'
        ? undefined
        : q.options.map((o, idx) => ({
            option_text: o.option_text,
            is_correct: o.is_correct,
            order_index: idx
          }))
  };
}

export function chosenToQuestionInputs(chosen: GeneratedQuestion[]): CreateQuestionInput[] {
  return chosen.map(mapQuestion);
}

/// For a `local` destination — same shape as a freshly-staged draft in the
/// single-page builder (no real id yet, correct_answer unused there).
export function chosenToDraftQuestions(chosen: GeneratedQuestion[]): DraftQuestion[] {
  return chosen.map((q) => ({
    id: null,
    question_text: q.question_text,
    question_type: q.question_type as QuizQuestionType,
    points: q.points,
    correct_answer: null,
    explanation: q.explanation || '',
    options:
      q.question_type === 'SHORT_ANSWER'
        ? []
        : q.options.map((o, idx) => ({
            option_text: o.option_text,
            is_correct: o.is_correct,
            order_index: idx
          }))
  }));
}

export function chosenToQuizInput(
  title: string,
  chosen: GeneratedQuestion[]
): CreateQuizInput {
  return {
    title,
    is_draft: true,
    questions: chosen.map(mapQuestion)
  };
}
