import { prisma } from '../../../db/prisma.js';
import { respondInternalError } from '../../../utils/httpError.js';
import {
  findTeacherOfferings,
  findTeacherOfferingByPublicId,
  overallPctByStudent,
  summarizeStudentOutcomes,
} from './courseReportShared.js';

const LIST_INCLUDE = {
  course: {
    select: {
      code: true,
      name: true,
      department: { select: { name: true } },
    },
  },
  section: {
    select: {
      name: true,
      batch: { select: { name: true } },
      _count: { select: { studentRegistrations: true } },
      studentRegistrations: {
        select: { student: { select: { id: true, full_name: true, number: true } } },
      },
    },
  },
  assignments: {
    where: { lifecycle: { publishStatus: 'PUBLISHED' } },
    select: {
      id: true,
      maxMarks: true,
    },
  },
  quizzes: {
    where: { is_draft: false },
    select: { id: true },
  },
  resources: {
    where: { is_draft: false, status: 'APPROVED' },
    select: { id: true },
  },
};

const DETAIL_INCLUDE = {
  course: {
    select: {
      code: true,
      name: true,
      department: { select: { name: true } },
    },
  },
  section: {
    select: {
      name: true,
      batch: { select: { name: true } },
      studentRegistrations: {
        select: { student: { select: { id: true, full_name: true, number: true } } },
      },
    },
  },
  assignments: {
    where: { lifecycle: { publishStatus: 'PUBLISHED' } },
    orderBy: { due_date: 'asc' },
    select: {
      id: true,
      title: true,
      due_date: true,
      maxMarks: true,
    },
  },
  quizzes: {
    where: { is_draft: false },
    orderBy: [{ close_at: 'asc' }, { created_at: 'desc' }],
    select: {
      id: true,
      title: true,
      close_at: true,
    },
  },
  resources: {
    where: { is_draft: false, status: 'APPROVED' },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
    },
  },
};

async function loadGradesForOfferings(offerings) {
  const assignmentIds = offerings.flatMap((o) => o.assignments.map((a) => a.id));
  const quizIds = offerings.flatMap((o) => o.quizzes.map((q) => q.id));
  const maxMarksByAssignmentId = new Map();
  for (const o of offerings) {
    for (const a of o.assignments) {
      maxMarksByAssignmentId.set(a.id, a.maxMarks || 100);
    }
  }

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length
      ? prisma.submission.findMany({
          where: { assignmentId: { in: assignmentIds }, gradeRow: { isNot: null } },
          select: {
            assignmentId: true,
            studentId: true,
            gradeRow: { select: { score: true } },
          },
        })
      : Promise.resolve([]),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizIds },
            submitted_at: { not: null },
            OR: [{ grade: { not: null } }, { score: { not: null } }],
          },
          select: {
            quizId: true,
            studentId: true,
            grade: true,
            score: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Group grades by offering via assignment/quiz ownership.
  const assignmentOffering = new Map();
  const quizOffering = new Map();
  for (const o of offerings) {
    for (const a of o.assignments) assignmentOffering.set(a.id, o.id);
    for (const q of o.quizzes) quizOffering.set(q.id, o.id);
  }

  const byOffering = new Map();
  for (const o of offerings) {
    byOffering.set(o.id, { submissions: [], attempts: [], maxMarksByAssignmentId: new Map() });
    for (const a of o.assignments) {
      byOffering.get(o.id).maxMarksByAssignmentId.set(a.id, a.maxMarks || 100);
    }
  }

  for (const s of submissions) {
    const oid = assignmentOffering.get(s.assignmentId);
    if (oid == null) continue;
    byOffering.get(oid).submissions.push(s);
  }
  for (const a of attempts) {
    const oid = quizOffering.get(a.quizId);
    if (oid == null) continue;
    byOffering.get(oid).attempts.push(a);
  }

  return byOffering;
}

/**
 * GET /api/lecturer-portal/course-reports
 * Table rows: content posted + failed student counts per course.
 */
export async function listCourseReports(req, res) {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });

    const offerings = await findTeacherOfferings(userId, LIST_INCLUDE);
    const gradesByOffering = await loadGradesForOfferings(offerings);

    const rows = offerings.map((o) => {
      const students = o.section.studentRegistrations.map((r) => r.student);
      const gradeBundle = gradesByOffering.get(o.id) ?? {
        submissions: [],
        attempts: [],
        maxMarksByAssignmentId: new Map(),
      };
      const pctByStudent = overallPctByStudent(gradeBundle);
      const outcomes = summarizeStudentOutcomes(students, pctByStudent);

      return {
        id: o.publicId,
        courseCode: o.course.code,
        courseName: o.course.name,
        department: o.course.department?.name ?? null,
        section: o.section.name,
        batch: o.section.batch?.name ?? null,
        students: students.length,
        quizzes: o.quizzes.length,
        assignments: o.assignments.length,
        resources: o.resources.length,
        failed: outcomes.failedCount,
        avgOverallPct: outcomes.avgOverallPct,
      };
    });

    rows.sort((a, b) =>
      `${a.courseCode} ${a.section}`.localeCompare(`${b.courseCode} ${b.section}`)
    );

    res.json({ generatedAt: new Date().toISOString(), rows });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to list course reports', e);
  }
}

/**
 * GET /api/lecturer-portal/course-reports/:offeringId
 * One course: content posted + class outcomes + failed students.
 */
export async function getCourseReport(req, res) {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });

    const { offeringId } = req.params;
    const offering = await findTeacherOfferingByPublicId(userId, offeringId, DETAIL_INCLUDE);
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    const gradesByOffering = await loadGradesForOfferings([offering]);
    const gradeBundle = gradesByOffering.get(offering.id) ?? {
      submissions: [],
      attempts: [],
      maxMarksByAssignmentId: new Map(),
    };
    const students = offering.section.studentRegistrations.map((r) => r.student);
    const pctByStudent = overallPctByStudent(gradeBundle);
    const outcomes = summarizeStudentOutcomes(students, pctByStudent);

    const studentRows = students
      .map((student) => {
        const overallPct = pctByStudent.get(student.id);
        return {
          studentId: student.id,
          name: student.full_name,
          number: student.number ?? null,
          overallPct: overallPct == null ? null : Math.round(overallPct * 10) / 10,
          status:
            overallPct == null ? 'No grades' : overallPct < 60 ? 'Failed' : 'Passed',
        };
      })
      .sort((a, b) => {
        if (a.overallPct == null && b.overallPct == null) return a.name.localeCompare(b.name);
        if (a.overallPct == null) return 1;
        if (b.overallPct == null) return -1;
        return a.overallPct - b.overallPct;
      });

    res.json({
      generatedAt: new Date().toISOString(),
      course: {
        id: offering.publicId,
        courseCode: offering.course.code,
        courseName: offering.course.name,
        department: offering.course.department?.name ?? null,
        section: offering.section.name,
        batch: offering.section.batch?.name ?? null,
      },
      content: {
        quizzes: offering.quizzes.length,
        assignments: offering.assignments.length,
        resources: offering.resources.length,
        quizItems: offering.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          dueAt: q.close_at?.toISOString?.() ?? q.close_at ?? null,
        })),
        assignmentItems: offering.assignments.map((a) => ({
          id: a.id,
          title: a.title,
          dueAt: a.due_date?.toISOString?.() ?? a.due_date ?? null,
        })),
        resourceItems: offering.resources.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
        })),
      },
      classSummary: {
        studentCount: students.length,
        avgOverallPct: outcomes.avgOverallPct,
        passedCount: outcomes.passedCount,
        failedCount: outcomes.failedCount,
        ungradedCount: outcomes.ungradedCount,
      },
      failedStudents: outcomes.failedStudents,
      students: studentRows,
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to build course report', e);
  }
}
