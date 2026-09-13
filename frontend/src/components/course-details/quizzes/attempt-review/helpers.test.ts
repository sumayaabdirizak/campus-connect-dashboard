import { describe, it, expect } from 'vitest';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import { computeAttemptStats } from './helpers';

describe('computeAttemptStats', () => {
  it('derives earned marks from score when per-answer points are missing (offline)', () => {
    const attempt = {
      id: 1,
      quizId: 1,
      studentId: 1,
      started_at: '2026-01-01T00:00:00Z',
      submitted_at: '2026-01-01T01:00:00Z',
      score: 90,
      grade: null,
      answers: [],
      quiz: {
        passing_score: 50,
        questions: [{ id: 1, points: 10, question_text: 'Q1', question_type: 'MCQ', order_index: 0, options: [] }]
      }
    } satisfies QuizAttempt;

    const stats = computeAttemptStats(attempt);

    expect(stats.earnedPoints).toBe(9);
    expect(stats.totalPoints).toBe(10);
    expect(stats.score).toBe(90);
  });
});
