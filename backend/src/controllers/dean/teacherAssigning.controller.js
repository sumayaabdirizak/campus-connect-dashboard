import { prisma } from "../../db/prisma.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const getFacultyProgramIds = async (facultyId) => {
  const departments = await prisma.department.findMany({
    where: { facultyId },
    select: { programs: { select: { id: true } } }
  });
  return departments.flatMap(d => d.programs.map(p => p.id));
};

// Verify a teacher is affiliated with the dean's faculty
const assertFacultyTeacher = async (teacherId, facultyId, res) => {
  const teacher = await prisma.user.findFirst({
    where: {
      id: Number(teacherId),
      lecturerProfile: { faculties: { some: { facultyId } } }
    },
    include: {
      role: { select: { name: true } },
      lecturerProfile: {
        include: { faculties: { include: { faculty: true } } }
      }
    }
  });
  if (!teacher) {
    res.status(403).json({ message: 'Teacher is not affiliated with your faculty.' });
    return null;
  }
  return teacher;
};

// Verify an assignment (Offering) belongs to the dean's faculty
const assertFacultyOffering = async (offeringId, facultyId, res) => {
  const deptIds = await prisma.department.findMany({
    where: { facultyId },
    select: { id: true }
  }).then(depts => depts.map(d => d.id));

  const offering = await prisma.courseOffering.findFirst({
    where: {
      id: Number(offeringId),
      course: { departmentId: { in: deptIds } }
    },
    include: {
      course: true,
      section: true
    }
  });
  if (!offering) {
    res.status(403).json({ message: 'Offering not found in your faculty.' });
    return null;
  }
  return offering;
};

// ─── 1. LIST TEACHERS IN FACULTY ─────────────────────────────────────────────
/**
 * GET /api/dean/teachers
 * Query: search, departmentId
 */
export const getFacultyTeachers = async (req, res) => {
  try {
    const { facultyId } = req;
    const { search, departmentId } = req.query;

    const teachers = await prisma.user.findMany({
      where: {
        lecturerProfile: {
          faculties: { some: { facultyId } },
          ...(departmentId ? { departmentId: Number(departmentId) } : {})
        },
        ...(search ? {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { number: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        number: true,
        phone: true,
        status: true,
        role: { select: { name: true } },
        lecturerProfile: {
          select: {
            id: true,
            specialty: true,
            hire_date: true,
            departmentId: true,
            faculties: { include: { faculty: { select: { id: true, name: true, code: true } } } }
          }
        },
        teacherAssignings: {
          select: {
            id: true,
            course: { select: { name: true, code: true } }
          }
        }
      },
      orderBy: { full_name: 'asc' }
    });

    const mapped = teachers.map(t => ({
      ...t,
      role: t.role.name,
      totalAssignments: t.teacherAssignings.length
    }));

    res.json({ message: 'Faculty teachers fetched', count: mapped.length, teachers: mapped });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch teachers', error: e.message });
  }
};

// ─── 2. GET TEACHER DETAILS ──────────────────────────────────────────────────
/**
 * GET /api/dean/teachers/:id
 */
export const getFacultyTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const teacher = await assertFacultyTeacher(id, facultyId, res);
    if (!teacher) return;

    const full = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true, full_name: true, email: true, number: true, phone: true, status: true,
        role: { select: { name: true } },
        lecturerProfile: {
          include: { faculties: { include: { faculty: true } } }
        },
        teacherAssignings: {
          include: {
            course: {
              include: {
                offerings: {
                  include: { section: true, semester: true }
                }
              }
            }
          }
        }
      }
    });

    res.json({ teacher: { ...full, role: full.role.name } });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch teacher', error: e.message });
  }
};

// ─── 3. GET ALL ASSIGNMENTS IN FACULTY ───────────────────────────────────────
/**
 * GET /api/dean/assignments
 * Query: teacherId, batchId, sectionId, departmentId
 */
export const getFacultyAssignments = async (req, res) => {
  try {
     res.status(410).json({ message: 'This endpoint is deprecated. Use /api/dean/offerings instead.' });
  } catch (e) {
    res.status(500).json({ message: 'Error', error: e.message });
  }
};

// ─── 4. CREATE ASSIGNMENT ────────────────────────────────────────────────────
/**
 * POST /api/dean/assignments
 */
export const createTeacherAssignment = async (req, res) => {
  res.status(410).json({ message: 'This endpoint is deprecated. Use /api/dean/courses/:id/teachers instead.' });
};

// ─── 5. UPDATE ASSIGNMENT ────────────────────────────────────────────────────
/**
 * PUT /api/dean/assignments/:id
 */
export const updateTeacherAssignment = async (req, res) => {
  res.status(410).json({ message: 'Deprecated. Modify courses or offerings instead.' });
};

// ─── 6. DELETE ASSIGNMENT ────────────────────────────────────────────────────
/**
 * DELETE /api/dean/assignments/:id
 */
export const deleteTeacherAssignment = async (req, res) => {
  res.status(410).json({ message: 'Deprecated.' });
};

// ─── 7. GET UNASSIGNED TEACHERS ──────────────────────────────────────────────
/**
 * GET /api/dean/teachers/unassigned
 */
export const getUnassignedTeachers = async (req, res) => {
  try {
    const { facultyId } = req;

    const teachers = await prisma.user.findMany({
      where: {
        lecturerProfile: { faculties: { some: { facultyId } } },
        teacherAssignings: { none: {} }
      },
      select: {
        id: true, full_name: true, email: true, number: true,
        lecturerProfile: { select: { specialty: true } }
      }
    });

    res.json({ message: 'Unassigned teachers fetched', count: teachers.length, teachers });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch unassigned teachers', error: e.message });
  }
};

// ─── 8. GET SECTIONS WITHOUT A TEACHER ───────────────────────────────────────
/**
 * GET /api/dean/sections/unassigned
 */
export const getUnassignedSections = async (req, res) => {
  try {
    const { facultyId } = req;
    const programIds = await getFacultyProgramIds(facultyId);

    const sections = await prisma.batchSection.findMany({
      where: {
        batch: { programId: { in: programIds } },
        offerings: { none: {} }
      },
      include: {
        batch: { include: { program: true, academicYear: true } },
        _count: { select: { studentRegistrations: true } }
      }
    });

    res.json({ message: 'Sections without teacher fetched', count: sections.length, sections });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch unassigned sections', error: e.message });
  }
};
