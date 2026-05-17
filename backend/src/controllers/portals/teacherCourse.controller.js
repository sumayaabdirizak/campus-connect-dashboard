import { prisma } from "../../db/prisma.js";

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
        section: true,
        assignments: {
          include: {
            _count: { select: { submissions: { where: { is_reviewed: false } } } }
          }
        },
        schedules: { take: 1, orderBy: { day_of_week: 'asc' } }
      }
    });

    const result = offerings.map(o => ({
      id: o.id,
      courseCode: o.course.code,
      courseName: o.course.name,
      department: o.course.department.name,
      section: o.section.name,
      thumbnail: o.course.thumbnail,
      pendingSubmissions: o.assignments.reduce((acc, curr) => acc + curr._count.submissions, 0),
      drafts: o.course._count.resources,
      nextClass: o.schedules[0] ? {
        day: o.schedules[0].day_of_week,
        time: o.schedules[0].start_time,
        location: o.schedules[0].location
      } : null
    }));

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
        id: parseInt(offeringId),
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
            batch: true
          }
        },
        schedules: true,
        assignments: {
          include: {
            _count: {
              select: {
                submissions: { where: { is_reviewed: false } }
              }
            }
          }
        },
        quizzes: {
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
        status: a.is_draft ? 'Draft' : 'Active'
      })),
      ...offering.quizzes.map(q => ({
        id: q.id,
        type: 'quiz',
        title: q.title,
        pendingCount: q._count.attempts,
        status: q.is_draft ? 'Draft' : 'Active'
      }))
    ];

    res.json({
      id: offering.id,
      course: offering.course,
      section: offering.section,
      batch: offering.section.batch,
      schedules: offering.schedules,
      toReview
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch course details', error: e.message });
  }
};
