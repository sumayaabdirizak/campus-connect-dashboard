import { prisma } from '../../../db/prisma.js';

/**
 * Course gradebook — every enrolled student × every published assignment/quiz,
 * with scores on the shared course mark budget (Course.maxMarks, default 100).
 */
export async function getTeacherGradebook(req, res) {
  const offering = req.courseOffering;

  const [section, assignments, quizzes, courseMaxMarks] = await Promise.all([
    prisma.batchSection.findUnique({
      where: { id: offering.sectionId },
      include: {
        studentRegistrations: {
          include: {
            student: {
              select: { id: true, full_name: true, email: true, number: true },
            },
          },
          orderBy: { student: { full_name: 'asc' } },
        },
      },
    }),
    prisma.assignment.findMany({
      where: { courseOfferingId: offering.id, lifecycle: { publishStatus: 'PUBLISHED' } },
      select: { id: true, title: true, maxMarks: true, due_date: true },
      orderBy: { due_date: 'asc' },
    }),
    prisma.quiz.findMany({
      where: { courseOfferingId: offering.id, is_draft: false },
      select: {
        id: true,
        title: true,
        maxMarks: true,
        marksPlan: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    }),
    prisma.courseOffering.findUnique({
      where: { id: offering.id },
      select: { course: { select: { maxMarks: true } } },
    }).then((row) => row?.course?.maxMarks ?? 100),
  ]);

  const students = section?.studentRegistrations?.map((r) => r.student) ?? [];
  const assignmentIds = assignments.map((a) => a.id);
  const quizIds = quizzes.map((q) => q.id);

  const quizMaxById = new Map(
    quizzes.map((q) => {
      const planTotal = q.marksPlan?.totalMarks;
      const weight =
        q.maxMarks > 0
          ? q.maxMarks
          : Number.isInteger(planTotal) && planTotal > 0
            ? planTotal
            : 0;
      return [q.id, weight];
    })
  );

  const allocatedMarks =
    assignments.reduce((s, a) => s + (a.maxMarks || 0), 0) +
    quizzes.reduce((s, q) => s + (quizMaxById.get(q.id) || 0), 0);

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length
      ? prisma.submission.findMany({
          where: { assignmentId: { in: assignmentIds } },
          select: {
            assignmentId: true,
            studentId: true,
            lateState: true,
            gradeRow: { select: { score: true } },
          },
        })
      : Promise.resolve([]),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: { quizId: { in: quizIds }, submitted_at: { not: null } },
          select: {
            quizId: true,
            studentId: true,
            grade: true,
            score: true,
            is_graded: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const subByKey = new Map();
  for (const s of submissions) subByKey.set(`${s.assignmentId}:${s.studentId}`, s);

  const quizByKey = new Map();
  for (const a of attempts) {
    const key = `${a.quizId}:${a.studentId}`;
    const prev = quizByKey.get(key) ?? { best: null, attempts: 0 };
    prev.attempts += 1;
    const pct = a.grade ?? a.score ?? null;
    if (pct != null && (prev.best == null || pct > prev.best)) prev.best = pct;
    quizByKey.set(key, prev);
  }

  const maxMarksById = new Map(assignments.map((a) => [a.id, a.maxMarks || 100]));

  const rows = students.map((student) => {
    const assignmentCells = {};
    const quizCells = {};
    let earned = 0;

    for (const a of assignments) {
      const sub = subByKey.get(`${a.id}:${student.id}`);
      if (!sub) {
        assignmentCells[a.id] = null;
        continue;
      }
      const maxMarks = maxMarksById.get(a.id) || 100;
      const rawGrade = sub.gradeRow?.score ?? null;
      const pct = rawGrade != null ? (rawGrade / maxMarks) * 100 : null;
      assignmentCells[a.id] = {
        grade: rawGrade,
        maxMarks,
        pct,
        submitted: true,
        late: sub.lateState === 'LATE',
        reviewed: sub.gradeRow != null,
      };
      if (rawGrade != null) earned += rawGrade;
    }

    for (const q of quizzes) {
      const entry = quizByKey.get(`${q.id}:${student.id}`);
      const weight = quizMaxById.get(q.id) || 0;
      if (!entry || entry.attempts === 0) {
        quizCells[q.id] = null;
        continue;
      }
      const pct = entry.best;
      const quizEarned =
        pct != null && weight > 0 ? (pct / 100) * weight : null;
      quizCells[q.id] = {
        pct,
        maxMarks: weight,
        earned: quizEarned,
        attempts: entry.attempts,
        taken: true,
      };
      if (quizEarned != null) earned += quizEarned;
    }

    const overallPct =
      courseMaxMarks > 0 ? (earned / courseMaxMarks) * 100 : null;

    return {
      studentId: student.id,
      name: student.full_name,
      email: student.email,
      number: student.number,
      assignments: assignmentCells,
      quizzes: quizCells,
      overallPct,
      overallEarned: earned,
      gradedCount:
        Object.values(assignmentCells).filter((c) => c?.grade != null).length +
        Object.values(quizCells).filter((c) => c?.pct != null).length,
    };
  });

  const columnAverage = (collect) => {
    const vals = [];
    for (const row of rows) {
      const cell = collect(row);
      if (cell?.pct != null) vals.push(cell.pct);
    }
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };

  const classEarnedAvg =
    rows.length > 0
      ? rows.reduce((s, r) => s + (r.overallEarned ?? 0), 0) / rows.length
      : null;

  const classAverages = {
    assignments: Object.fromEntries(
      assignments.map((a) => [a.id, columnAverage((row) => row.assignments[a.id])])
    ),
    quizzes: Object.fromEntries(
      quizzes.map((q) => [q.id, columnAverage((row) => row.quizzes[q.id])])
    ),
    overall:
      classEarnedAvg != null && courseMaxMarks > 0
        ? (classEarnedAvg / courseMaxMarks) * 100
        : null,
    overallEarned: classEarnedAvg,
  };

  res.json({
    courseMaxMarks,
    markBudget: {
      courseMax: courseMaxMarks,
      allocated: allocatedMarks,
      remaining: Math.max(0, courseMaxMarks - allocatedMarks),
    },
    columns: {
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        maxMarks: a.maxMarks || 100,
      })),
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        maxMarks: quizMaxById.get(q.id) || 0,
      })),
    },
    students: rows,
    classAverages,
    studentCount: rows.length,
  });
}
