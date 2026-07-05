import { prisma } from "../../db/prisma.js";
import { resolveCourseThumbnail } from "../../utils/publicAssetUrl.js";

function buildQuickLinks(resources = []) {
  const visible = resources.filter((r) => !r.is_draft && r.status === "APPROVED");
  const syllabus = visible.find((r) => r.type === "SYLLABUS") ?? null;
  return {
    syllabus: syllabus
      ? {
          id: syllabus.id,
          title: syllabus.title,
          url: syllabus.url,
          type: syllabus.type,
        }
      : null,
    resourcesCount: visible.length,
  };
}

function computeOfferingProgress(offering) {
  const resources = offering.resources ?? [];
  const assignments = offering.assignments ?? [];
  const quizzes = offering.quizzes ?? [];

  const resourceDone = resources.filter((r) =>
    (r.views ?? []).some((v) => v.completed)
  ).length;
  const assignmentDone = assignments.filter((a) => (a._count?.submissions ?? 0) > 0).length;
  const quizDone = quizzes.filter((q) => (q._count?.attempts ?? 0) > 0).length;

  const totalLessons = resources.length + assignments.length + quizzes.length;
  const completedLessons = resourceDone + assignmentDone + quizDone;
  const progress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    totalLessons,
    completedLessons,
    progress,
    status: totalLessons > 0 && completedLessons >= totalLessons ? 'completed' : 'active',
    pendingItems:
      assignments.filter((a) => (a._count?.submissions ?? 0) === 0).length +
      quizzes.filter((q) => (q._count?.attempts ?? 0) === 0).length,
  };
}

/**
 * GET /api/student-portal/my-courses
 * Returns courses offered to the student's current registration section + semester
 */
export const getMyCourses = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid user context' });
    }

    // 1. Get student's current active registration
    const registration = await prisma.studentRegistration.findFirst({
      where: { studentId: userId },
      orderBy: { created_at: 'desc' },
      include: {
        batchSection: {
          include: {
            batch: { include: { program: { include: { department: true } } } }
          }
        },
        currentAcademicYear: true,
        currentSemester: true
      }
    });

    if (!registration) {
      return res.status(200).json({ success: true, offerings: [] }); // Friendly empty state
    }

    // 2. Find course offerings for this section
    const offerings = await prisma.courseOffering.findMany({
      where: {
        sectionId: registration.batchSectionId,
        semesterId: registration.currentSemesterId,
        academicYearId: registration.currentAcademicYearId
      },
      include: {
        course: {
          include: {
            department: true,
          }
        },
        teacher: {
          select: { id: true, full_name: true, email: true }
        },
        resources: {
          where: { is_draft: false, status: 'APPROVED' },
          select: {
            id: true,
            views: {
              where: { studentId: userId },
              select: { completed: true }
            }
          }
        },
        assignments: {
          where: { is_draft: false },
          include: {
            _count: {
              select: {
                submissions: { where: { studentId: userId } }
              }
            }
          }
        },
        quizzes: {
          where: { is_draft: false },
          include: {
            _count: {
              select: {
                attempts: { where: { studentId: userId } }
              }
            }
          }
        }
      }
    });

    const transformed = offerings.map((o) => {
      const metrics = computeOfferingProgress(o);

      return {
        id: o.publicId,
        courseCode: o.course.code,
        courseName: o.course.name,
        instructor: o.teacher?.full_name || 'TBA',
        department: o.course.department.name,
        section: registration.batchSection.name,
        thumbnail: resolveCourseThumbnail(o.course.thumbnail, o.course.code),
        pendingItems: metrics.pendingItems,
        schedule: [],
        nextClass: null,
        totalLessons: metrics.totalLessons,
        completedLessons: metrics.completedLessons,
        progress: metrics.progress,
        status: metrics.status,
      };
    });

    res.json({
      success: true,
      offerings: transformed,
      registration: {
        batch: registration.batchSection.batch.name,
        section: registration.batchSection.name,
        semester: registration.currentSemester.name
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch student courses', error: e.message });
  }
};

/**
 * GET /api/student-portal/courses/:offeringId
 * Returns detailed info for a specific course offering.
 */
export const getCourseDetail = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const userId = Number(req.user.sub);

    const offering = await prisma.courseOffering.findFirst({
      where: {
        publicId: offeringId,
        section: {
          studentRegistrations: {
            some: { studentId: userId }
          }
        }
      },
      include: {
        course: {
          include: { department: true }
        },
        section: {
          include: {
            batch: true,
            _count: { select: { studentRegistrations: true } }
          }
        },
        resources: {
          where: {
            is_draft: false,
            status: 'APPROVED'
          },
          orderBy: [{ type: 'asc' }, { created_at: 'desc' }],
          select: {
            id: true,
            title: true,
            type: true,
            url: true,
            is_draft: true,
            status: true,
            created_at: true
          }
        },
        assignments: {
          where: { is_draft: false },
          orderBy: { due_date: 'asc' },
          include: {
            _count: {
              select: { submissions: { where: { studentId: userId } } }
            }
          }
        },
        quizzes: {
          where: { is_draft: false },
          orderBy: [{ close_at: 'asc' }, { created_at: 'desc' }],
          include: {
            _count: {
              select: { attempts: { where: { studentId: userId } } }
            }
          }
        }
      }
    });

    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    // Prepare pending tasks
    const toReview = [
      ...offering.assignments.map(a => ({
        id: a.id,
        type: 'assignment',
        title: a.title,
        pendingCount: a._count.submissions === 0 ? 1 : 0, // 1 means not submitted
        status: 'Active',
        dueAt: a.due_date,
        openAt: a.open_at
      })),
      ...offering.quizzes
        .map(q => ({
          id: q.id,
          type: 'quiz',
          title: q.title,
          pendingCount: q._count.attempts === 0 ? 1 : 0,
          status: 'Active',
          dueAt: q.close_at,
          openAt: q.open_at
        }))
    ].sort((a, b) => {
      const at = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });

    res.json({
      id: offering.publicId,
      course: {
        ...offering.course,
        thumbnail: resolveCourseThumbnail(
          offering.course.thumbnail,
          offering.course.code
        ),
      },
      section: offering.section,
      batch: offering.section.batch,
      schedules: [],
      toReview,
      quickLinks: buildQuickLinks(offering.resources)
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch course details', error: e.message });
  }
};
