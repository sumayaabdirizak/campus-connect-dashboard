import { prisma } from "../../../db/prisma.js";
import { resolveCourseThumbnail } from "../../../utils/publicAssetUrl.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { canManageOfferingContent } from "../../../utils/courseOfferingAccess.js";
import { buildQuickLinks } from "./helpers.js";

/**
 * GET /api/lecturer/courses/:offeringId
 * Returns detailed info for a specific course offering.
 * Required for Image 2: Course Detail.
 */
export const getCourseDetail = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const offering = await prisma.courseOffering.findFirst({
      where: { publicId: offeringId },
      include: {
        course: {
          include: {
            department: true
          }
        },
        section: {
          include: {
            batch: {
              include: {
                program: { include: { department: true } },
              },
            },
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
            lifecycle: { select: { publishStatus: true } },
            _count: {
              select: {
                submissions: { where: { gradeRow: { is: null } } },
              },
            },
          },
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
    if (!(await canManageOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Prepare "To Review" list
    const toReview = [
      ...offering.assignments.map(a => ({
        id: a.id,
        type: 'assignment',
        title: a.title,
        pendingCount: a._count.submissions,
        status: a.lifecycle?.publishStatus === 'DRAFT' ? 'Draft' : 'Active',
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
    respondInternalError(res, 'Failed to fetch course details', e);
  }
};
