import { prisma } from "../../../db/prisma.js";
import { resolveCourseThumbnail } from "../../../utils/publicAssetUrl.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { ensureTeacherOfferings } from "../../../features/academic/ensureTeacherOfferings.js";

/**
 * GET /api/lecturer/courses
 * Returns course offerings for this teacher (creates missing ones from assignings).
 */
export const getMyCourses = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });

    await ensureTeacherOfferings(userId);

    const offerings = await prisma.courseOffering.findMany({
      where: {
        teacherId: userId
      },
      include: {
        course: {
          include: {
            department: true,
            _count: { select: { resources: { where: { is_draft: false } } } }
          }
        },
        section: {
          include: {
            _count: { select: { studentRegistrations: true } }
          }
        },
        resources: {
          where: { is_draft: false, status: 'APPROVED' },
          select: { id: true }
        },
        quizzes: {
          where: { is_draft: false },
          select: { id: true }
        },
        assignments: {
          where: { lifecycle: { publishStatus: 'PUBLISHED' } },
          include: {
            _count: { select: { submissions: { where: { gradeRow: { is: null } } } } }
          }
        }
      }
    });

    const result = offerings.map(o => {
      const totalLessons = o.resources.length + o.assignments.length + o.quizzes.length;
      return {
        id: o.publicId,
        courseCode: o.course.code,
        courseName: o.course.name,
        department: o.course.department.name,
        section: o.section.name,
        thumbnail: resolveCourseThumbnail(o.course.thumbnail, o.course.code),
        totalStudents: o.section._count.studentRegistrations,
        totalLessons,
        pendingSubmissions: o.assignments.reduce((acc, curr) => acc + curr._count.submissions, 0),
        drafts: o.course._count.resources,
        status: 'active',
        createdAt: o.created_at.toISOString(),
        nextClass: null
      };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to fetch teacher courses', e);
  }
};
