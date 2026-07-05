import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  requireCourseOfferingManage,
  requireCourseOfferingRead,
} from '../../middleware/courseOfferingRbac.js';

const router = Router();

/**
 * A student's own grades for one offering — the same per-item normalisation as
 * the teacher gradebook, scoped to the caller. Any enrolled course member can
 * read it (`requireCourseOfferingRead`); the handler only ever loads rows for
 * `req.user.sub`, so a student can't see anyone else's marks.
 */
router.get(
  '/:courseOfferingId/me', requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
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
  })
);

/**
 * Course gradebook — every enrolled student × every published assignment/quiz,
 * with normalised percentages and a computed course total. Teacher/dean only
 * (scoped by `requireCourseOfferingManage`).
 *
 * Normalisation: quiz attempts already store `grade` as a percentage
 * (`earned / totalPoints * 100`, see services/quizAttempt.service.js), whereas
 * assignment submissions store raw points out of `Assignment.maxMarks`. We
 * convert assignment grades to a percentage here so the overall average and
 * the per-column class averages are apples-to-apples.
 */
router.get(
  '/:courseOfferingId', requireCourseOfferingManage(),
  asyncHandler(async (req, res) => {
    const offering = req.courseOffering;

    const [section, assignments, quizzes] = await Promise.all([
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

    const students = section?.studentRegistrations?.map((r) => r.student) ?? [];
    const assignmentIds = assignments.map((a) => a.id);
    const quizIds = quizzes.map((q) => q.id);

    const [submissions, attempts] = await Promise.all([
      assignmentIds.length
        ? prisma.submission.findMany({
            where: { assignmentId: { in: assignmentIds } },
            select: {
              assignmentId: true,
              studentId: true,
              grade: true,
              is_late: true,
              is_reviewed: true,
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

    // Index submissions by `${assignmentId}:${studentId}` (one per pair).
    const subByKey = new Map();
    for (const s of submissions) subByKey.set(`${s.assignmentId}:${s.studentId}`, s);

    // For quizzes a student may have several attempts; keep the best graded one
    // plus a total attempt count so the UI can show "best of N".
    const quizByKey = new Map(); // `${quizId}:${studentId}` -> { best, attempts }
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
      const pcts = []; // graded percentages for this student's overall average

      for (const a of assignments) {
        const sub = subByKey.get(`${a.id}:${student.id}`);
        if (!sub) {
          assignmentCells[a.id] = null;
          continue;
        }
        const maxMarks = maxMarksById.get(a.id) || 100;
        const pct = sub.grade != null ? (sub.grade / maxMarks) * 100 : null;
        assignmentCells[a.id] = {
          grade: sub.grade,
          maxMarks,
          pct,
          submitted: true,
          late: sub.is_late,
          reviewed: sub.is_reviewed,
        };
        if (pct != null) pcts.push(pct);
      }

      for (const q of quizzes) {
        const entry = quizByKey.get(`${q.id}:${student.id}`);
        if (!entry || entry.attempts === 0) {
          quizCells[q.id] = null;
          continue;
        }
        quizCells[q.id] = {
          pct: entry.best,
          attempts: entry.attempts,
          taken: true,
        };
        if (entry.best != null) pcts.push(entry.best);
      }

      const overallPct =
        pcts.length > 0 ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;

      return {
        studentId: student.id,
        name: student.full_name,
        email: student.email,
        number: student.number,
        assignments: assignmentCells,
        quizzes: quizCells,
        overallPct,
        gradedCount: pcts.length,
      };
    });

    // Per-column class averages (over students who have a percentage there).
    const columnAverage = (collect) => {
      const vals = [];
      for (const row of rows) {
        const cell = collect(row);
        if (cell?.pct != null) vals.push(cell.pct);
      }
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };

    const classAverages = {
      assignments: Object.fromEntries(
        assignments.map((a) => [a.id, columnAverage((row) => row.assignments[a.id])])
      ),
      quizzes: Object.fromEntries(
        quizzes.map((q) => [q.id, columnAverage((row) => row.quizzes[q.id])])
      ),
      overall:
        rows.filter((r) => r.overallPct != null).length > 0
          ? rows
              .filter((r) => r.overallPct != null)
              .reduce((s, r) => s + r.overallPct, 0) /
            rows.filter((r) => r.overallPct != null).length
          : null,
    };

    res.json({
      columns: {
        assignments: assignments.map((a) => ({
          id: a.id,
          title: a.title,
          maxMarks: a.maxMarks || 100,
        })),
        quizzes: quizzes.map((q) => ({ id: q.id, title: q.title })),
      },
      students: rows,
      classAverages,
      studentCount: rows.length,
    });
  })
);

export default router;
