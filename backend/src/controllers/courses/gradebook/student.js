import { prisma } from '../../../db/prisma.js';

export async function getStudentGrades(req, res) {
  const offering = req.courseOffering;
  const studentId = Number(req.user.sub);

  const [assignments, quizzes] = await Promise.all([
    prisma.assignment.findMany({
      where: { courseOfferingId: offering.id, is_draft: false },
      select: { id: true, title: true, maxMarks: true, due_date: true },
      orderBy: { due_date: 'asc' },
    }),
    prisma.quiz.findMany({
      where: { courseOfferingId: offering.id, is_draft: false },
      select: { id: true, title: true, created_at: true },
      orderBy: { created_at: 'asc' },
    }),
  ]);

  const assignmentIds = assignments.map((a) => a.id);
  const quizIds = quizzes.map((q) => q.id);

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length
      ? prisma.submission.findMany({
          where: { assignmentId: { in: assignmentIds }, studentId },
          select: {
            assignmentId: true,
            grade: true,
            is_late: true,
            is_reviewed: true,
          },
        })
      : Promise.resolve([]),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: { quizId: { in: quizIds }, studentId, submitted_at: { not: null } },
          select: { quizId: true, grade: true, score: true },
        })
      : Promise.resolve([]),
  ]);

  const subByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));
  const bestByQuiz = new Map();
  for (const a of attempts) {
    const prev = bestByQuiz.get(a.quizId) ?? { best: null, attempts: 0 };
    prev.attempts += 1;
    const pct = a.grade ?? a.score ?? null;
    if (pct != null && (prev.best == null || pct > prev.best)) prev.best = pct;
    bestByQuiz.set(a.quizId, prev);
  }

  const pcts = [];
  const items = [];

  for (const a of assignments) {
    const sub = subByAssignment.get(a.id);
    const maxMarks = a.maxMarks || 100;
    const pct = sub?.grade != null ? (sub.grade / maxMarks) * 100 : null;
    if (pct != null) pcts.push(pct);
    items.push({
      kind: 'assignment',
      id: a.id,
      title: a.title,
      maxMarks,
      grade: sub?.grade ?? null,
      pct,
      submitted: Boolean(sub),
      late: sub?.is_late ?? false,
      reviewed: sub?.is_reviewed ?? false,
      dueAt: a.due_date,
    });
  }

  for (const q of quizzes) {
    const entry = bestByQuiz.get(q.id);
    const pct = entry?.best ?? null;
    if (pct != null) pcts.push(pct);
    items.push({
      kind: 'quiz',
      id: q.id,
      title: q.title,
      pct,
      attempts: entry?.attempts ?? 0,
      taken: Boolean(entry?.attempts),
    });
  }

  const overallPct =
    pcts.length > 0 ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;

  res.json({
    items,
    overallPct,
    gradedCount: pcts.length,
    totalItems: assignments.length + quizzes.length,
  });
}
