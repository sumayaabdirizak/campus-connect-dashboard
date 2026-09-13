import { prisma } from '../../../db/prisma.js';
import { computeAttemptExpiresAt } from './attemptTiming.js';
import {
  buildQuestionsSnapshot,
  materializeFromSnapshot,
  materializeNaturalOrder,
} from './attemptSnapshot.js';

/** Sum violations/warnings on submitted attempts only (open attempt counted separately). */
export async function loadLifetimeViolations(quizId, studentId) {
  const rows = await prisma.quizAttempt.findMany({
    where: { quizId, studentId, submitted_at: { not: null } },
    select: { violations_count: true, warnings_shown: true },
  });
  return {
    priorViolations: rows.reduce((s, a) => s + (a.violations_count || 0), 0),
    priorWarnings: rows.reduce((s, a) => s + (a.warnings_shown || 0), 0),
  };
}

/**
 * Create or resume an in-progress attempt with expires_at + questions_snapshot.
 * @returns {{ attempt, questions } | { error: string }}
 */
export async function ensureInProgressAttempt({ quiz, studentId, now, openAttempt }) {
  let attempt = openAttempt;

  if (!attempt) {
    const expires_at = computeAttemptExpiresAt(quiz, now);
    if (expires_at.getTime() <= now.getTime()) {
      return { error: 'Quiz time window has ended' };
    }
    const questions_snapshot = buildQuestionsSnapshot(quiz);
    attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        studentId,
        expires_at,
        questions_snapshot,
      },
    });
    return {
      attempt,
      questions: materializeFromSnapshot(quiz, questions_snapshot),
    };
  }

  if (!attempt.expires_at) {
    attempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { expires_at: computeAttemptExpiresAt(quiz, attempt.started_at) },
    });
  }

  if (attempt.questions_snapshot) {
    return {
      attempt,
      questions: materializeFromSnapshot(quiz, attempt.questions_snapshot),
    };
  }

  // Legacy resume: freeze natural order (no reshuffle).
  const questions_snapshot = buildQuestionsSnapshot({
    ...quiz,
    shuffle_questions: false,
    shuffle_answers: false,
  });
  attempt = await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: { questions_snapshot },
  });
  return { attempt, questions: materializeNaturalOrder(quiz) };
}
