import fs from "fs";
import { prisma } from "../../db/prisma.js";
import { enforceUploadContentSafety } from "../courses/resources.js";
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

/**
 * GET /api/lecturer/courses
 * Returns all course offerings currently assigned to the teacher.
 * Required for Image 1: My Courses grid.
 */
export const getMyCourses = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });
    
    // 1. Get IDs of courses this teacher is assigned to
    const assignments = await prisma.teacherAssigning.findMany({
      where: { teacherId: userId },
      select: { courseId: true }
    });
    
    const assignedCourseIds = assignments.map(a => a.courseId);

    // 2. Fetch offerings ONLY for these specific courses where this specific teacher is assigned
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
          where: { is_draft: false },
          include: {
            _count: { select: { submissions: { where: { is_reviewed: false } } } }
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
    res.status(500).json({ message: 'Failed to fetch teacher courses', error: e.message });
  }
};

/**
 * GET /api/lecturer/courses/:offeringId
 * Returns detailed info for a specific course offering.
 * Required for Image 2: Course Detail.
 */
export const getCourseDetail = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const userId = Number(req.user.sub);

    const offering = await prisma.courseOffering.findFirst({
      where: { 
        publicId: offeringId,
        teacherId: userId
      },
      include: {
        course: {
          include: {
            department: true
          }
        },
        section: {
          include: {
            batch: true,
            _count: { select: { studentRegistrations: true } }
          }
        },
        resources: {
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
          orderBy: { due_date: 'asc' },
          include: {
            _count: {
              select: {
                submissions: { where: { is_reviewed: false } }
              }
            }
          }
        },
        quizzes: {
          orderBy: [{ close_at: 'asc' }, { created_at: 'desc' }],
          include: {
            _count: {
              select: {
                attempts: { where: { is_graded: false } }
              }
            }
          }
        }
      }
    });

    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    // Prepare "To Review" list
    const toReview = [
      ...offering.assignments.map(a => ({
        id: a.id,
        type: 'assignment',
        title: a.title,
        pendingCount: a._count.submissions,
        status: a.is_draft ? 'Draft' : 'Active',
        dueAt: a.due_date,
        openAt: a.open_at
      })),
      ...offering.quizzes.map(q => ({
        id: q.id,
        type: 'quiz',
        title: q.title,
        pendingCount: q._count.attempts,
        status: q.is_draft ? 'Draft' : 'Active',
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

/**
 * POST /api/lecturer-portal/courses/:offeringId/cover
 * Teacher uploads a cover image for a course they teach. The image is stored
 * under /uploads/covers and persisted to Course.thumbnail. Scope is enforced
 * by matching the offering's teacherId to the caller, so a teacher can only
 * change the cover of courses they actually teach. Note: thumbnail lives on
 * the shared Course record, so the cover applies to every section of it.
 */
export const updateCourseCover = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const userId = Number(req.user.sub);

    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const offering = await prisma.courseOffering.findFirst({
      where: { publicId: offeringId, teacherId: userId },
      select: { courseId: true }
    });
    if (!offering) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Course not found or you do not teach it' });
    }

    // Content-sniff the upload — the extension filter only trusts the filename;
    // this confirms the bytes are actually an image before we expose the URL.
    const verdict = await enforceUploadContentSafety([req.file]);
    if (!verdict.ok) {
      return res.status(400).json({ message: 'File contents do not match an image. Upload rejected.' });
    }

    const url = `/uploads/covers/${req.file.filename}`;

    const course = await prisma.course.update({
      where: { id: offering.courseId },
      data: { thumbnail: url },
      select: { id: true, name: true, code: true, thumbnail: true }
    });

    res.json({ success: true, course });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update course cover', error: e.message });
  }
};
