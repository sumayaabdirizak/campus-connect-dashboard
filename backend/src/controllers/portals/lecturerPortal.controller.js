import { prisma } from "../../db/prisma.js";

/**
 * GET /api/lecturer-portal/my-assignments
 * Returns courses the lecturer is assigned to, along with the sections (offerings) for those courses.
 */
export const getMyAssignments = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid user context' });
    }

    // 1. Find courses assigned to this lecturer
    const assignments = await prisma.teacherCourse.findMany({
      where: { teacherId: userId },
      include: {
        course: {
          include: {
            offerings: {
              include: {
                section: { include: { batch: { include: { program: true } } } },
                semester: true,
                academicYear: true
              }
            }
          }
        }
      }
    });

    res.json({
      message: 'Lecturer assignments retrieved',
      assignments: assignments.map(a => ({
        courseId: a.courseId,
        courseName: a.course.name,
        courseCode: a.course.code,
        assignedAt: a.assigned_at,
        offerings: a.course.offerings.map(o => ({
          offeringId: o.id,
          section: o.section.name,
          batch: o.section.batch.name,
          program: o.section.batch.program.name,
          semester: o.semester.name,
          academicYear: o.academicYear.name
        }))
      }))
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch lecturer assignments', error: e.message });
  }
};
