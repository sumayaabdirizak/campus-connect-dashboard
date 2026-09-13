import { prisma } from '../../../db/prisma.js';
import { respondInternalError } from '../../../utils/httpError.js';
import { ensureTeacherOfferings } from '../../../services/academic/ensureTeacherOfferings.js';
import { resolveActiveAcademicTerm } from '../../../services/academic/resolveActiveAcademicTerm.js';

/**
 * Resolve offerings the lecturer can grade (same access as getMyCourses).
 */
async function loadTeacherOfferings(userId) {
  await ensureTeacherOfferings(userId);

  const assignings = await prisma.teacherAssigning.findMany({
    where: { teacherId: userId },
    select: { courseId: true },
  });
  const assignedCourseIds = [...new Set(assignings.map((a) => a.courseId))];

  const accessOr = [{ teacherId: userId }];
  if (assignedCourseIds.length > 0) {
    accessOr.push({ courseId: { in: assignedCourseIds } });
  }

  const activeTerm = await resolveActiveAcademicTerm({ includeDb: true });
  const include = {
    course: { select: { code: true, name: true } },
    section: {
      select: {
        name: true,
        batch: { select: { name: true } },
      },
    },
    assignments: {
      where: { lifecycle: { publishStatus: 'PUBLISHED' } },
      select: {
        id: true,
        title: true,
        due_date: true,
        _count: {
          select: { submissions: { where: { gradeRow: { is: null } } } },
        },
        submissions: {
          where: { gradeRow: { is: null } },
          select: { submitted_at: true },
          orderBy: { submitted_at: 'asc' },
          take: 1,
        },
      },
    },
    quizzes: {
      where: { is_draft: false },
      select: {
        id: true,
        title: true,
        close_at: true,
        _count: {
          select: {
            attempts: {
              where: { is_graded: false, submitted_at: { not: null } },
            },
          },
        },
        attempts: {
          where: { is_graded: false, submitted_at: { not: null } },
          select: { submitted_at: true },
          orderBy: { submitted_at: 'asc' },
          take: 1,
        },
      },
    },
  };

  if (activeTerm.academicYearId) {
    const scoped = await prisma.courseOffering.findMany({
      where: { OR: accessOr, academicYearId: activeTerm.academicYearId },
      include,
    });
    if (scoped.length > 0) return scoped;
  }

  return prisma.courseOffering.findMany({
    where: { OR: accessOr },
    include,
  });
}

function earliestIso(...dates) {
  const times = dates
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .filter((t) => Number.isFinite(t));
  if (!times.length) return null;
  return new Date(Math.min(...times)).toISOString();
}

/**
 * GET /api/lecturer-portal/grading-workload
 * Pending assignment submissions + ungraded quiz attempts across the teacher's courses.
 */
export const getGradingWorkload = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });

    const offerings = await loadTeacherOfferings(userId);

    const courses = offerings.map((o) => {
      const items = [];
      let pendingSubmissions = 0;
      let pendingQuizAttempts = 0;
      const oldestCandidates = [];

      for (const a of o.assignments) {
        const pendingCount = a._count.submissions;
        if (pendingCount <= 0) continue;
        pendingSubmissions += pendingCount;
        const oldestPendingAt = a.submissions[0]?.submitted_at?.toISOString?.()
          ?? a.submissions[0]?.submitted_at
          ?? null;
        if (oldestPendingAt) oldestCandidates.push(oldestPendingAt);
        items.push({
          id: a.id,
          type: 'assignment',
          title: a.title,
          pendingCount,
          dueAt: a.due_date?.toISOString?.() ?? a.due_date ?? null,
          oldestPendingAt:
            typeof oldestPendingAt === 'string'
              ? oldestPendingAt
              : oldestPendingAt
                ? new Date(oldestPendingAt).toISOString()
                : null,
        });
      }

      for (const q of o.quizzes) {
        const pendingCount = q._count.attempts;
        if (pendingCount <= 0) continue;
        pendingQuizAttempts += pendingCount;
        const oldestPendingAt = q.attempts[0]?.submitted_at?.toISOString?.()
          ?? q.attempts[0]?.submitted_at
          ?? null;
        if (oldestPendingAt) oldestCandidates.push(oldestPendingAt);
        items.push({
          id: q.id,
          type: 'quiz',
          title: q.title,
          pendingCount,
          dueAt: q.close_at?.toISOString?.() ?? q.close_at ?? null,
          oldestPendingAt:
            typeof oldestPendingAt === 'string'
              ? oldestPendingAt
              : oldestPendingAt
                ? new Date(oldestPendingAt).toISOString()
                : null,
        });
      }

      items.sort((a, b) => b.pendingCount - a.pendingCount);

      return {
        id: o.publicId,
        courseCode: o.course.code,
        courseName: o.course.name,
        section: o.section.name,
        batch: o.section.batch?.name ?? null,
        pendingSubmissions,
        pendingQuizAttempts,
        pendingTotal: pendingSubmissions + pendingQuizAttempts,
        oldestPendingAt: earliestIso(...oldestCandidates),
        items,
      };
    });

    courses.sort((a, b) => b.pendingTotal - a.pendingTotal);

    const totals = {
      pendingSubmissions: courses.reduce((s, c) => s + c.pendingSubmissions, 0),
      pendingQuizAttempts: courses.reduce((s, c) => s + c.pendingQuizAttempts, 0),
      coursesWithBacklog: courses.filter((c) => c.pendingTotal > 0).length,
      courseCount: courses.length,
      oldestPendingAt: earliestIso(...courses.map((c) => c.oldestPendingAt)),
    };

    res.json({
      generatedAt: new Date().toISOString(),
      totals: {
        ...totals,
        pendingTotal: totals.pendingSubmissions + totals.pendingQuizAttempts,
      },
      courses,
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to build grading workload', e);
  }
};
