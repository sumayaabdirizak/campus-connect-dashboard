import { prisma } from "../../db/prisma.js";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const getFacultyDepartmentIds = async (facultyId) => {
  const depts = await prisma.department.findMany({
    where: { facultyId },
    select: { id: true }
  });
  return depts.map(d => d.id);
};

const assertFacultyCourse = async (courseId, facultyId, res) => {
  const deptIds = await getFacultyDepartmentIds(facultyId);
  const course = await prisma.course.findFirst({
    where: { id: Number(courseId), departmentId: { in: deptIds } }
  });
  if (!course) {
    res.status(403).json({ message: 'Course does not belong to your faculty.' });
    return null;
  }
  return course;
};

// ─── 1. LIST COURSES ──────────────────────────────────────────────────────────
/**
 * GET /api/dean/courses
 * Query: search, departmentId
 */
export const getFacultyCourses = async (req, res) => {
  try {
    const { facultyId } = req;
    const { search, departmentId } = req.query;
    const deptIds = await getFacultyDepartmentIds(facultyId);

    const courses = await prisma.course.findMany({
      where: {
        departmentId: departmentId ? Number(departmentId) : { in: deptIds },
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        teacherAssignings: {
          include: {
            teacher: { select: { id: true, full_name: true, email: true } }
          }
        },
        _count: { select: { offerings: true, teacherAssignings: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ message: 'Courses fetched', count: courses.length, courses });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch courses', error: e.message });
  }
};

// ─── 2. GET SINGLE COURSE ──────────────────────────────────────────────────────
/**
 * GET /api/dean/courses/:id
 */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const course = await assertFacultyCourse(id, facultyId, res);
    if (!course) return;

    const full = await prisma.course.findUnique({
      where: { id: Number(id) },
      include: {
        department: true,
        teacherAssigning: {
          include: {
            teacher: {
              select: { id: true, full_name: true, email: true, number: true,
                lecturerProfile: { select: { specialty: true } } }
            }
          }
        },
        offerings: {
          include: {
            section: { include: { batch: { include: { program: true } } } },
            semester: true,
            academicYear: true
          }
        }
      }
    });

    res.json({ course: full });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch course', error: e.message });
  }
};

// ─── 3. CREATE COURSE ─────────────────────────────────────────────────────────
/**
 * POST /api/dean/courses
 * Body: { name, code, description?, credits?, departmentId }
 */
export const createCourse = async (req, res) => {
  try {
    const { facultyId } = req;
    const { name, code, description, credits, departmentId } = req.body;

    if (!name || !code || !departmentId) {
      return res.status(400).json({ message: 'name, code, and departmentId are required.' });
    }

    // Verify department is in dean's faculty
    const deptIds = await getFacultyDepartmentIds(facultyId);
    if (!deptIds.includes(Number(departmentId))) {
      return res.status(403).json({ message: 'Department does not belong to your faculty.' });
    }

    const course = await prisma.course.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description ?? null,
        credits: Number(credits) || 3,
        departmentId: Number(departmentId)
      },
      include: {
        department: { select: { name: true, code: true } }
      }
    });

    res.status(201).json({ message: 'Course created successfully', course });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ message: 'A course with this code already exists.' });
    }
    res.status(500).json({ message: 'Failed to create course', error: e.message });
  }
};

// ─── 4. UPDATE COURSE ─────────────────────────────────────────────────────────
/**
 * PUT /api/dean/courses/:id
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;
    const { name, code, description, credits } = req.body;

    const existing = await assertFacultyCourse(id, facultyId, res);
    if (!existing) return;

    const updated = await prisma.course.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(credits && { credits: Number(credits) })
      },
      include: { department: { select: { name: true, code: true } } }
    });

    res.json({ message: 'Course updated', course: updated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update course', error: e.message });
  }
};

// ─── 5. DELETE COURSE ─────────────────────────────────────────────────────────
/**
 * DELETE /api/dean/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultyCourse(id, facultyId, res);
    if (!existing) return;

    const offeringCount = await prisma.courseOffering.count({ where: { courseId: Number(id) } });
    if (offeringCount > 0) {
      return res.status(409).json({
        message: `Cannot delete — this course has ${offeringCount} active offering(s). Remove them first.`
      });
    }

    await prisma.$transaction([
      prisma.teacherAssigning.deleteMany({ where: { courseId: Number(id) } }),
      prisma.course.delete({ where: { id: Number(id) } })
    ]);

    res.json({ message: 'Course deleted successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete course', error: e.message });
  }
};

// ─── 6. ASSIGN TEACHER TO COURSE ─────────────────────────────────────────────
/**
 * POST /api/dean/courses/:id/teachers
 * Body: { teacherId }
 */
export const assignTeacherToCourse = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { teacherId } = req.body;
    const { facultyId } = req;

    if (!teacherId) return res.status(400).json({ message: 'teacherId is required.' });

    const course = await assertFacultyCourse(courseId, facultyId, res);
    if (!course) return;

    // Verify teacher belongs to this faculty
    const teacher = await prisma.user.findFirst({
      where: {
        id: Number(teacherId),
        lecturerProfile: { faculties: { some: { facultyId } } }
      }
    });
    if (!teacher) {
      return res.status(403).json({ message: 'Teacher is not affiliated with your faculty.' });
    }

    const assigning = await prisma.teacherAssigning.create({
      data: {
        teacherId: Number(teacherId),
        courseId: Number(courseId)
      },
      include: {
        teacher: { select: { id: true, full_name: true, email: true } },
        course: { select: { id: true, name: true, code: true } }
      }
    });

    res.status(201).json({ message: 'Teacher assigned to course', assignment: assigning });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ message: 'Teacher is already assigned to this course.' });
    }
    res.status(500).json({ message: 'Failed to assign teacher', error: e.message });
  }
};

// ─── 7. REMOVE TEACHER FROM COURSE ───────────────────────────────────────────
/**
 * DELETE /api/dean/courses/:id/teachers/:teacherId
 */
export const removeTeacherFromCourse = async (req, res) => {
  try {
    const { id: courseId, teacherId } = req.params;
    const { facultyId } = req;

    const course = await assertFacultyCourse(courseId, facultyId, res);
    if (!course) return;

    const record = await prisma.teacherAssigning.findFirst({
      where: { courseId: Number(courseId), teacherId: Number(teacherId) }
    });
    if (!record) return res.status(404).json({ message: 'Teacher assignment not found.' });

    await prisma.teacherAssigning.delete({ where: { id: record.id } });

    res.json({ message: 'Teacher removed from course.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to remove teacher', error: e.message });
  }
};

// ─── 8. LIST COURSE OFFERINGS ─────────────────────────────────────────────────
/**
 * GET /api/dean/offerings
 * Query: courseId, sectionId, semesterId, academicYearId
 */
export const getCourseOfferings = async (req, res) => {
  try {
    const { facultyId } = req;
    const { courseId, sectionId, semesterId, academicYearId } = req.query;
    const deptIds = await getFacultyDepartmentIds(facultyId);

    const offerings = await prisma.courseOffering.findMany({
      where: {
        course: { departmentId: { in: deptIds } },
        ...(courseId ? { courseId: Number(courseId) } : {}),
        ...(sectionId ? { sectionId: Number(sectionId) } : {}),
        ...(semesterId ? { semesterId: Number(semesterId) } : {}),
        ...(academicYearId ? { academicYearId: Number(academicYearId) } : {})
      },
      include: {
        course: {
          select: { id: true, name: true, code: true, credits: true,
            teacherAssignings: {
              include: { teacher: { select: { id: true, full_name: true } } }
            }
          }
        },
        section: { include: { batch: { include: { program: { select: { name: true } } } } } },
        semester: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ message: 'Offerings fetched', count: offerings.length, offerings });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch offerings', error: e.message });
  }
};

// ─── 9. CREATE COURSE OFFERING ────────────────────────────────────────────────
/**
 * POST /api/dean/offerings
 * Body: { courseId, sectionId, semesterId, academicYearId }
 */
export const createCourseOffering = async (req, res) => {
  try {
    const { facultyId } = req;
    const { courseId, sectionId, semesterId, academicYearId } = req.body;

    if (!courseId || !sectionId || !semesterId || !academicYearId) {
      return res.status(400).json({ message: 'courseId, sectionId, semesterId, academicYearId are required.' });
    }

    // Verify course belongs to this faculty
    const course = await assertFacultyCourse(courseId, facultyId, res);
    if (!course) return;

    // Verify section belongs to this faculty's programs
    const deptIds = await getFacultyDepartmentIds(facultyId);
    const section = await prisma.batchSection.findFirst({
      where: {
        id: Number(sectionId),
        batch: { program: { departmentId: { in: deptIds } } }
      },
      include: { batch: { include: { program: true } } }
    });
    if (!section) {
      return res.status(403).json({ message: 'Section does not belong to your faculty.' });
    }

    // Check: course must have at least one teacher assigned
    const teacherCount = await prisma.teacherAssigning.count({ where: { courseId: Number(courseId) } });
    if (teacherCount === 0) {
      return res.status(400).json({
        message: 'Assign at least one teacher to this course before creating an offering.'
      });
    }

    const offering = await prisma.courseOffering.create({
      data: {
        courseId: Number(courseId),
        sectionId: Number(sectionId),
        semesterId: Number(semesterId),
        academicYearId: Number(academicYearId)
      },
      include: {
        course: {
          select: { name: true, code: true, credits: true,
            teacherAssignings: { include: { teacher: { select: { full_name: true } } } }
          }
        },
        section: { include: { batch: { include: { program: true } } } },
        semester: true,
        academicYear: true
      }
    });

    res.status(201).json({
      message: `"${offering.course.name}" offered to ${section.name} — ${offering.semester.name} / ${offering.academicYear.name}`,
      offering
    });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ message: 'This course is already offered to this section for this semester.' });
    }
    res.status(500).json({ message: 'Failed to create offering', error: e.message });
  }
};

// ─── 10. DELETE COURSE OFFERING ───────────────────────────────────────────────
/**
 * DELETE /api/dean/offerings/:id
 */
export const deleteCourseOffering = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;
    const deptIds = await getFacultyDepartmentIds(facultyId);

    const offering = await prisma.courseOffering.findFirst({
      where: { id: Number(id), course: { departmentId: { in: deptIds } } }
    });
    if (!offering) return res.status(403).json({ message: 'Offering not found in your faculty.' });

    await prisma.courseOffering.delete({ where: { id: Number(id) } });

    res.json({ message: 'Course offering removed.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete offering', error: e.message });
  }
};
