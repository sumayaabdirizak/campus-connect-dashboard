import { prisma } from "../../db/prisma.js";
import { resolveCourseThumbnail } from "../../utils/publicAssetUrl.js";
import { respondInternalError } from "../../utils/httpError.js";
import { ensureSectionOfferings } from "../../services/academic/ensureSectionOfferings.js";
import { loadUniversityAcademicForUserId, resolveOfferingTermFromUniversity, loadBatchSemesterForUserId } from "../../services/integrations/academicInfoSystem/universityStudentAcademic.js";

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
 * Courses the student is taking: offerings for their ACTIVE section + current term.
 * Missing offerings are auto-created from catalogue (semester match + teachers).
 */
export const getMyCourses = async (req, res) => {
  try {
    const userId = Number(req.user.sub ?? req.user.id);
    if (!userId) {
      return res.status(401).json({ message: "Invalid user context" });
    }

    const registration = await prisma.studentRegistration.findFirst({
      where: { studentId: userId },
      orderBy: { created_at: "desc" },
      include: {
        batchSection: {
          include: {
            batch: {
              include: {
                program: { include: { department: true } },
              },
            },
          },
        },
        currentAcademicYear: true,
        currentSemester: true,
      },
    });

    if (!registration) {
      return res.status(200).json({ success: true, offerings: [] });
    }

    const isGraduated = registration.status === "GRADUATED";

    const universityAcademic = await loadUniversityAcademicForUserId(userId, {
      refresh: true,
    });
    const universityTerms = await resolveOfferingTermFromUniversity(universityAcademic);

    let termAcademicYearId = registration.currentAcademicYearId;
    let termSemesterId = registration.currentSemesterId;

    if (universityTerms) {
      termAcademicYearId = universityTerms.currentAcademicYearId;
      termSemesterId = universityTerms.currentSemesterId;

      if (
        registration.currentAcademicYearId !== termAcademicYearId ||
        registration.currentSemesterId !== termSemesterId
      ) {
        await prisma.studentRegistration.update({
          where: { id: registration.id },
          data: {
            currentAcademicYearId: termAcademicYearId,
            currentSemesterId: termSemesterId,
            registrationAcademicYearId: termAcademicYearId,
          },
        });
      }
    }

    const curriculumSemester = registration.batchSection.batch.semester_number;
    const programDepartmentId = registration.batchSection.batch.program.departmentId;

    if (!isGraduated) {
      const facultyId = registration.batchSection.batch.program.department.facultyId;
      const deptRows = await prisma.department.findMany({
        where: { facultyId },
        select: { id: true },
      });
      const departmentIds = deptRows.map((d) => d.id);

      await ensureSectionOfferings({
        sectionId: registration.batchSectionId,
        academicYearId: termAcademicYearId,
        semesterId: termSemesterId,
        curriculumSemester,
        departmentIds,
        programDepartmentId,
      });
    }

    const offerings = await prisma.courseOffering.findMany({
      where: {
        sectionId: registration.batchSectionId,
        semesterId: termSemesterId,
        academicYearId: termAcademicYearId,
        course: {
          departmentId: programDepartmentId,
          OR: [
            { semesterNumber: Number(curriculumSemester) },
            { semesterNumber: null },
          ],
        },
      },
      include: {
        course: {
          include: {
            department: true,
            teacherAssignings: {
              include: {
                teacher: { select: { id: true, full_name: true } },
              },
              take: 3,
              orderBy: { assigned_at: "asc" },
            },
          },
        },
        teacher: {
          select: { id: true, full_name: true, email: true },
        },
        resources: {
          where: { is_draft: false, status: "APPROVED" },
          select: {
            id: true,
            views: {
              where: { studentId: userId },
              select: { completed: true },
            },
          },
        },
        assignments: {
          where: { lifecycle: { publishStatus: 'PUBLISHED' } },
          include: {
            _count: {
              select: {
                submissions: { where: { studentId: userId } },
              },
            },
          },
        },
        quizzes: {
          where: { is_draft: false },
          include: {
            _count: {
              select: {
                attempts: { where: { studentId: userId } },
              },
            },
          },
        },
      },
    });

    const universityAcademicForResponse = universityAcademic;

    const transformed = offerings.map((o) => {
      const metrics = computeOfferingProgress(o);
      const fromAssignings = (o.course.teacherAssignings ?? [])
        .map((ta) => ta.teacher?.full_name)
        .filter(Boolean)
        .join(", ");

      return {
        id: o.publicId,
        courseCode: o.course.code,
        courseName: o.course.name,
        instructor: o.teacher?.full_name || fromAssignings || "TBA",
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

    const batchSemester = await loadBatchSemesterForUserId(userId);

    res.json({
      success: true,
      offerings: transformed,
      isGraduated,
      graduatedAt: registration.graduatedAt,
      universityAcademic: universityAcademicForResponse ?? null,
      batchSemester,
      registration: {
        batch: registration.batchSection.batch.name,
        section: registration.batchSection.name,
        semester: batchSemester.label ?? null,
      },
    });
  } catch (e) {
    respondInternalError(res, "Failed to fetch student courses", e);
  }
};

/**
 * GET /api/student-portal/semester-history
 * Every semester the student's section has offered courses in (past + present),
 * each with a summary of the courses taken. Works for both active and graduated
 * students since it's keyed off the section, not the live registration status.
 */
export const getSemesterHistory = async (req, res) => {
  try {
    const userId = Number(req.user.sub ?? req.user.id);
    if (!userId) {
      return res.status(401).json({ message: "Invalid user context" });
    }

    const registration = await prisma.studentRegistration.findFirst({
      where: { studentId: userId },
      orderBy: { created_at: "desc" },
      select: { batchSectionId: true },
    });

    if (!registration) {
      return res.status(200).json({ success: true, semesters: [] });
    }

    const offerings = await prisma.courseOffering.findMany({
      where: { sectionId: registration.batchSectionId },
      include: {
        course: { select: { code: true, name: true, credits: true } },
        semester: { select: { id: true, name: true, sequence: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ semester: { sequence: "desc" } }],
    });

    const bySemester = new Map();
    for (const o of offerings) {
      const key = `${o.semesterId}-${o.academicYearId}`;
      if (!bySemester.has(key)) {
        bySemester.set(key, {
          semesterId: o.semester.id,
          semesterName: o.semester.name,
          academicYearName: o.academicYear.name,
          sequence: o.semester.sequence,
          courses: [],
        });
      }
      bySemester.get(key).courses.push({
        code: o.course.code,
        name: o.course.name,
        credits: o.course.credits,
      });
    }

    res.json({
      success: true,
      semesters: [...bySemester.values()].sort((a, b) => b.sequence - a.sequence),
    });
  } catch (e) {
    respondInternalError(res, "Failed to fetch semester history", e);
  }
};

/**
 * GET /api/student-portal/courses/:offeringId
 * Returns detailed info for a specific course offering.
 */
export const getCourseDetail = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const userId = Number(req.user.sub ?? req.user.id);

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
          where: { lifecycle: { publishStatus: 'PUBLISHED' } },
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
    respondInternalError(res, 'Failed to fetch course details', e);
  }
};
