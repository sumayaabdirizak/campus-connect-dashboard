import { prisma } from '../../../db/prisma.js';

export async function getStudentGrades(req, res) {
  const offering = req.courseOffering;
  const studentId = Number(req.user.sub);

  const [assignments, quizzes, courseMaxMarks] = await Promise.all([
    prisma.assignment.findMany({
      where: { courseOfferingId: offering.id, lifecycle: { publishStatus: 'PUBLISHED' } },
      select: { id: true, title: true, maxMarks: true, due_date: true },
      orderBy: { due_date: 'asc' },
    }),
    prisma.quiz.findMany({
      where: { courseOfferingId: offering.id, is_draft: false },
      select: { id: true, title: true, maxMarks: true, marksPlan: true, created_at: true },
      orderBy: { created_at: 'asc' },
    }),
    prisma.courseOffering.findUnique({
      where: { id: offering.id },
      select: { course: { select: { maxMarks: true } } },
    }).then((row) => row?.course?.maxMarks ?? 100),
  ]);

  const assignmentIds = assignments.map((a) => a.id);
  const quizIds = quizzes.map((q) => q.id);

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length
      ? prisma.submission.findMany({
          where: { assignmentId: { in: assignmentIds }, studentId },
          select: {
            assignmentId: true,
            lateState: true,
            gradeRow: { select: { score: true } },
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

  let earned = 0;
  let gradedCount = 0;
  const items = [];

  for (const a of assignments) {
    const sub = subByAssignment.get(a.id);
    const maxMarks = a.maxMarks || 100;
    const rawGrade = sub?.gradeRow?.score ?? null;
    const pct = rawGrade != null ? (rawGrade / maxMarks) * 100 : null;
    if (rawGrade != null) {
      earned += rawGrade;
      gradedCount += 1;
    }
    items.push({
      kind: 'assignment',
      id: a.id,
      title: a.title,
      maxMarks,
      grade: rawGrade,
      pct,
      submitted: Boolean(sub),
      late: sub?.lateState === 'LATE',
      reviewed: sub?.gradeRow != null,
      dueAt: a.due_date,
    });
  }

  for (const q of quizzes) {
    const entry = bestByQuiz.get(q.id);
    const planTotal = q.marksPlan?.totalMarks;
    const maxMarks =
      q.maxMarks > 0
        ? q.maxMarks
        : Number.isInteger(planTotal) && planTotal > 0
          ? planTotal
          : 0;
    const pct = entry?.best ?? null;
    if (pct != null && maxMarks > 0) {
      earned += (pct / 100) * maxMarks;
      gradedCount += 1;
    }
    items.push({
      kind: 'quiz',
      id: q.id,
      title: q.title,
      maxMarks,
      pct,
      attempts: entry?.attempts ?? 0,
      taken: Boolean(entry?.attempts),
    });
  }

  const overallPct =
    courseMaxMarks > 0 ? (earned / courseMaxMarks) * 100 : null;

  res.json({
    items,
    courseMaxMarks,
    overallPct,
    overallEarned: earned,
    gradedCount,
    totalItems: assignments.length + quizzes.length,
  });
}
