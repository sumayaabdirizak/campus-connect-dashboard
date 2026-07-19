import type { GeneratedQuestion } from '../../api/question-bank-types';
import type { CreateQuizInput } from '../../api/quizzes-types';

export function chosenToBankImport(chosen: GeneratedQuestion[]) {
  return chosen.map((q) => ({
    question_text: q.question_text,
    question_type: q.question_type,
    points: q.points,
    topic: q.topic || null,
    difficulty: q.difficulty,
    options:
      q.question_type === 'SHORT_ANSWER'
        ? undefined
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
    questions: chosen.map((q) => ({
      question_text: q.question_text,
      question_type: q.question_type,
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
    }))
  };
}
