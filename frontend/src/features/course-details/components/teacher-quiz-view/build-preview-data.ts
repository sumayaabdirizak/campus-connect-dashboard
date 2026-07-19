import type { Quiz, QuizStartResponse } from '../../api/quizzes-types';

/** Synthesize a QuizStartResponse from the teacher's quiz — no backend trip. */
export function buildPreviewData(quiz: Quiz): QuizStartResponse {
  const questions = quiz.questions ?? [];
  return {
    attempt: {
      id: -1,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + quiz.duration_minutes * 60_000).toISOString(),
      violations_count: 0,
      warnings_shown: 0,
    },
    serverTime: new Date().toISOString(),
    quiz: {
      id: quiz.id,
      title: quiz.title,
      duration_minutes: quiz.duration_minutes,
      passing_score: quiz.passing_score,
      timing_mode: quiz.timing_mode,
      open_at: quiz.open_at,
      close_at: quiz.close_at,
    },
    questions: questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      order_index: q.order_index,
      options: q.options.map((o) => ({ id: o.id, option_text: o.option_text })),
    })),
    savedAnswers: [],
    totalQuestions: questions.length,
    totalPoints: questions.reduce((s, q) => s + q.points, 0),
  };
}
