import { prisma } from '../db/prisma.js';
import { notifyQuizPublished } from '../controllers/courses/quizzes/notifyStudents.js';

/**
 * Publish drafts flagged `auto_publish_at_open` once `open_at` has passed.
 * Skips quizzes with zero questions (left as draft; teacher must add content).
 * @returns {Promise<number>} number published
 */
export async function autoPublishScheduledQuizzes(now = new Date()) {
  const due = await prisma.quiz.findMany({
    where: {
      is_draft: true,
      auto_publish_at_open: true,
      open_at: { not: null, lte: now },
    },
    select: {
      id: true,
      title: true,
      courseOfferingId: true,
      courseOffering: { select: { publicId: true } },
      _count: { select: { questions: true } },
    },
  });

  let published = 0;
  for (const q of due) {
    if (q._count.questions === 0) {
      console.warn(
        `[quiz] skip auto-publish quiz ${q.id}: no questions`
      );
      continue;
    }
    const updated = await prisma.quiz.update({
      where: { id: q.id },
      data: {
        is_draft: false,
        auto_publish_at_open: false,
      },
    });
    notifyQuizPublished(updated, q.courseOffering.publicId);
    published += 1;
  }
  return published;
}
