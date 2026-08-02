import { prisma } from '../../db/prisma.js';
import { lateStateFromBool } from './lifecycleCore.js';

function resolveScore(score) {
  if (score === null || score === '') return null;
  const n = Number(score);
  return Number.isNaN(n) ? null : n;
}

/**
 * Write SubmissionGrade (source of truth for scores + reviewed state).
 * Presence of a row ⇒ reviewed. `score` may be null (reviewed, no marks).
 */
export async function upsertSubmissionGrade(
  submissionId,
  { score, feedback, gradedById, isReviewed = true },
  db = prisma,
) {
  if (isReviewed === false) {
    await db.submissionGrade.deleteMany({ where: { submissionId } });
    return;
  }

  const existing = await db.submissionGrade.findUnique({
    where: { submissionId },
    select: { submissionId: true },
  });

  if (score !== undefined) {
    const resolved = resolveScore(score);
    await db.submissionGrade.upsert({
      where: { submissionId },
      create: {
        submissionId,
        score: resolved,
        feedback: feedback ?? null,
        gradedById: gradedById ?? null,
      },
      update: {
        score: resolved,
        ...(feedback !== undefined && { feedback }),
        gradedById: gradedById ?? null,
        gradedAt: new Date(),
      },
    });
    return;
  }

  // No score in payload: keep existing score, or create reviewed-without-score.
  if (existing) {
    await db.submissionGrade.update({
      where: { submissionId },
      data: {
        ...(feedback !== undefined && { feedback }),
        gradedById: gradedById ?? null,
        gradedAt: new Date(),
      },
    });
    return;
  }

  await db.submissionGrade.create({
    data: {
      submissionId,
      score: null,
      feedback: feedback ?? null,
      gradedById: gradedById ?? null,
    },
  });
}

export async function clearSubmissionGrade(submissionId, db = prisma) {
  await db.submissionGrade.deleteMany({ where: { submissionId } });
}

export function submissionLateFields(isLate) {
  return { lateState: lateStateFromBool(Boolean(isLate)) };
}
