import { prisma } from '../db/prisma.js';
import { cohortWindowEnd } from '../controllers/courses/quiz-taking/shared.js';
import {
  notifyQuizClosingSoon,
  notifyQuizOpening,
} from '../controllers/courses/quizzes/notifyStudents.js';

const CLOSING_LEAD_MS = 24 * 60 * 60 * 1000;

/**
 * QUIZ_OPENING for published quizzes whose open_at just passed.
 * @returns {Promise<number>}
 */
export async function sendQuizOpeningReminders(now = new Date()) {
  const due = await prisma.quiz.findMany({
    where: {
      is_draft: false,
      open_at: { not: null, lte: now },
      open_notified_at: null,
    },
    select: {
      id: true,
      title: true,
      courseOfferingId: true,
      courseOffering: { select: { publicId: true } },
    },
    take: 50,
  });

  let n = 0;
  for (const q of due) {
    await prisma.quiz.update({
      where: { id: q.id },
      data: { open_notified_at: now },
    });
    notifyQuizOpening(q, q.courseOffering.publicId);
    n += 1;
  }
  return n;
}

/**
 * QUIZ_CLOSING_SOON within 24h of window end (students with attempts left).
 * @returns {Promise<number>}
 */
export async function sendQuizClosingReminders(now = new Date()) {
  const candidates = await prisma.quiz.findMany({
    where: {
      is_draft: false,
      closing_notified_at: null,
      OR: [
        { timing_mode: 'flexible', close_at: { not: null, gt: now } },
        { timing_mode: 'fixed', open_at: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      courseOfferingId: true,
      timing_mode: true,
      open_at: true,
      close_at: true,
      duration_minutes: true,
      max_attempts: true,
      courseOffering: { select: { publicId: true } },
    },
    take: 80,
  });

  let n = 0;
  for (const q of candidates) {
    const end = cohortWindowEnd(q);
    if (!end) continue;
    const msLeft = end.getTime() - now.getTime();
    if (msLeft <= 0 || msLeft > CLOSING_LEAD_MS) continue;
    if (q.open_at && new Date(q.open_at).getTime() > now.getTime()) continue;

    const userIds = await studentsWithAttemptsLeft(q.id, q.max_attempts);
    await prisma.quiz.update({
      where: { id: q.id },
      data: { closing_notified_at: now },
    });
    if (userIds.length > 0) {
      notifyQuizClosingSoon(q, q.courseOffering.publicId, { userIds });
    }
    n += 1;
  }
  return n;
}

async function studentsWithAttemptsLeft(quizId, maxAttempts) {
  const groups = await prisma.quizAttempt.groupBy({
    by: ['studentId'],
    where: { quizId, submitted_at: { not: null } },
    _count: { _all: true },
  });
  const used = new Map(groups.map((g) => [g.studentId, g._count._all]));

  const offering = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      courseOffering: {
        select: {
          section: {
            select: {
              studentRegistrations: { select: { studentId: true } },
            },
          },
        },
      },
    },
  });
  const enrolled =
    offering?.courseOffering?.section?.studentRegistrations?.map((r) => r.studentId) ??
    [];
  return enrolled.filter((id) => (used.get(id) ?? 0) < maxAttempts);
}

/** Run both reminder sweeps. */
export async function runQuizReminderTicks(now = new Date()) {
  const opened = await sendQuizOpeningReminders(now);
  const closing = await sendQuizClosingReminders(now);
  return { opened, closing };
}
