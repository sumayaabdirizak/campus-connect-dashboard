import { prisma } from "../../db/prisma.js";

/**
 * GET /api/student-portal/my-courses
 * Returns courses offered to the student's current registration section + semester
 */
export const getMyCourses = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    console.log('getMyCourses: userId extracted:', userId);
    if (!userId) {
      console.log('getMyCourses: 401 returned - Invalid user context');
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
            _count: { select: { resources: { where: { is_draft: false } } } }
          }
        },
        teacher: {
          select: { id: true, full_name: true, email: true }
        },
        assignments: {
          include: {
            _count: { 
              select: { 
                submissions: { where: { studentId: userId } } 
              } 
            }
          }
        },
        schedules: {
          take: 1,
          orderBy: { day_of_week: 'asc' }
        }
      }
    });

    // 3. Transform for premium UI
    const transformed = offerings.map(o => {
      const pendingAssignments = o.assignments.filter(a => a._count.submissions === 0).length;
      
      return {
        id: o.id,
        courseCode: o.course.code,
        courseName: o.course.name,
        instructor: o.teacher?.full_name || 'TBA',
        department: o.course.department.name,
        section: registration.batchSection.name,
        thumbnail: `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800`, // Placeholder
        pendingItems: pendingAssignments,
        nextClass: o.schedules[0] ? {
          day: o.schedules[0].day_of_week,
          time: o.schedules[0].start_time,
          location: o.schedules[0].location
        } : null,
        progress: 0 // Track progression logic could go here
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
        id: parseInt(offeringId)
      },
      include: {
        course: {
          include: { department: true }
        },
        section: {
          include: { batch: true }
        },
        schedules: true,
        assignments: {
          include: {
            _count: {
              select: { submissions: { where: { studentId: userId } } }
            }
          }
        },
        quizzes: {
          include: {}
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
        status: 'Active'
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
