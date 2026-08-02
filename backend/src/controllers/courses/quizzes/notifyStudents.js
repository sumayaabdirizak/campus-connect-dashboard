import { prisma } from '../../../db/prisma.js';
import { notifyCourseOfferingStudents } from '../../../services/courseActivityNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';

function quizHref(offeringPublicId, quizId) {
  return `${courseOfferingDashboardPath(offeringPublicId, 'quizzes')}&quiz=${quizId}`;
}

/** Suppress QUIZ_OPENING when publish already covers a live window. */
async function stampOpenNotifiedIfLive(quiz) {
  if (!quiz?.id) return;
  if (quiz.open_at && new Date(quiz.open_at).getTime() > Date.now()) return;
  await prisma.quiz
    .update({
      where: { id: quiz.id },
      data: { open_notified_at: new Date() },
    })
    .catch(() => {});
}

/** Fire-and-forget student alerts when a quiz is published. */
export function notifyQuizPublished(quiz, offeringPublicId) {
  void notifyCourseOfferingStudents({
    courseOfferingId: quiz.courseOfferingId,
    kind: 'QUIZ_PUBLISHED',
    title: 'New quiz',
    body: quiz.title,
    href: quizHref(offeringPublicId, quiz.id),
    tag: `quiz-new-${quiz.id}`,
    ctaLabel: 'Open quiz',
  })
    .then(() => stampOpenNotifiedIfLive(quiz))
    .catch(() => {});
}

export function notifyQuizOpening(quiz, offeringPublicId) {
  void notifyCourseOfferingStudents({
    courseOfferingId: quiz.courseOfferingId,
    kind: 'QUIZ_OPENING',
    title: 'Quiz is open',
    body: quiz.title,
    href: quizHref(offeringPublicId, quiz.id),
    tag: `quiz-open-${quiz.id}`,
    ctaLabel: 'Start quiz',
  }).catch(() => {});
}

export function notifyQuizClosingSoon(quiz, offeringPublicId, { userIds } = {}) {
  void notifyCourseOfferingStudents({
    courseOfferingId: quiz.courseOfferingId,
    kind: 'QUIZ_CLOSING_SOON',
    title: 'Quiz closing soon',
    body: quiz.title,
    href: quizHref(offeringPublicId, quiz.id),
    tag: `quiz-closing-${quiz.id}`,
    ctaLabel: 'Open quiz',
    userIds,
  }).catch(() => {});
}

export function notifyQuizGraded(quiz, offeringPublicId, { studentId, score }) {
  const scoreLabel =
    typeof score === 'number' ? `${Math.round(score)}%` : 'ready';
  void notifyCourseOfferingStudents({
    courseOfferingId: quiz.courseOfferingId,
    kind: 'QUIZ_GRADED',
    title: 'Quiz graded',
    body: `${quiz.title} · ${scoreLabel}`,
    href: quizHref(offeringPublicId, quiz.id),
    tag: `quiz-graded-${quiz.id}-${studentId}`,
    ctaLabel: 'View results',
    userIds: [studentId],
  }).catch(() => {});
}
