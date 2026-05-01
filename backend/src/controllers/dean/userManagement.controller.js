import { prisma } from "../../db/prisma.js";
import bcrypt from 'bcrypt';
import { whereUsersInFaculty as inFacultyWhere } from "../../utils/scopeWhere.js";
import { paginatedPayload } from "../../utils/pagination.js";

// Verify a user belongs to the dean's faculty or 404
const assertInFaculty = async (userId, facultyId, res) => {
  const user = await prisma.user.findFirst({
    where: inFacultyWhere(facultyId, { id: userId })
  });
  if (!user) {
    res.status(403).json({ message: 'User does not belong to your faculty.' });
    return null;
  }
  return user;
};

// ─── 1. GET ALL USERS IN FACULTY ─────────────────────────────────────────────
/**
 * GET /api/dean/users
 * Query params: role, search, page, limit
 */
export const getFacultyUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const { facultyId } = req;
    const skip = (Number(page) - 1) * Number(limit);

    const where = inFacultyWhere(facultyId, {
      ...(role ? { role: { name: role } } : {}),
      ...(search ? {
        AND: [
          {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { number: { contains: search, mode: 'insensitive' } }
            ]
          }
        ]
      } : {})
    });

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          full_name: true,
          email: true,
          number: true,
          phone: true,
          status: true,
          must_change_password: true,
          last_login_at: true,
          created_at: true,
          role: { select: { name: true } },
          studentProfile: {
            select: {
              student_number: true,
              admission_year: true,
              facultyId: true,
              departmentId: true,
              programId: true
            }
          },
          lecturerProfile: {
            select: {
              specialty: true,
              hire_date: true,
              departmentId: true,
              faculties: { include: { faculty: { select: { id: true, name: true, code: true } } } }
            }
          },
          deanProfile: { select: { facultyId: true } }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const mapped = users.map(u => ({
      ...u,
      role: u.role.name
    }));

    res.json(
      paginatedPayload({
        total,
        page: Number(page),
        pageSize: Number(limit),
        results: mapped,
      })
    );
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch users', error: e.message });
  }
};

// ─── 2. GET SINGLE USER IN FACULTY ───────────────────────────────────────────
/**
 * GET /api/dean/users/:id
 */
export const getFacultyUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const user = await prisma.user.findFirst({
      where: inFacultyWhere(facultyId, { id: Number(id) }),
      select: {
        id: true,
        full_name: true,
        email: true,
        number: true,
        phone: true,
        status: true,
        created_at: true,
        role: { select: { name: true } },
        studentProfile: {
          select: {
            student_number: true,
            admission_year: true,
            facultyId: true,
            departmentId: true,
            programId: true
          }
        },
        lecturerProfile: {
          select: {
            specialty: true,
            hire_date: true,
            faculties: { include: { faculty: true } }
          }
        },
        studentRegistrations: {
          include: {
            batchSection: { include: { batch: { include: { program: true } } } },
            currentAcademicYear: true,
            currentSemester: true
          }
        }
      }
    });

    if (!user) {
      return res.status(403).json({ message: 'User not found in your faculty.' });
    }

    res.json({ user: { ...user, role: user.role.name } });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch user', error: e.message });
  }
};

// ─── 3. UPDATE USER IN FACULTY ───────────────────────────────────────────────
/**
 * PUT /api/dean/users/:id
 * Allowed fields: full_name, phone, status
 */
export const updateFacultyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertInFaculty(Number(id), facultyId, res);
    if (!existing) return;

    const { full_name, phone, status } = req.body;

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...(full_name && { full_name }),
        ...(phone !== undefined && { phone }),
        ...(status && { status })
      },
      select: {
        id: true, full_name: true, email: true, number: true, phone: true, status: true
      }
    });

    res.json({ message: 'User updated successfully', user: updated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update user', error: e.message });
  }
};

// ─── 4. REMOVE USER FROM FACULTY ─────────────────────────────────────────────
/**
 * DELETE /api/dean/users/:id
 */
export const removeFacultyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertInFaculty(Number(id), facultyId, res);
    if (!existing) return;

    await prisma.user.delete({ where: { id: Number(id) } });

    res.json({ message: 'User removed from faculty successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to remove user', error: e.message });
  }
};

// ─── 5. PENDING REGISTRATIONS ────────────────────────────────────────────────
/**
 * GET /api/dean/registrations/pending
 * Returns users with status INACTIVE in this faculty (awaiting approval)
 */
export const getPendingRegistrations = async (req, res) => {
  try {
    const { facultyId } = req;

    const pending = await prisma.user.findMany({
      where: inFacultyWhere(facultyId, { status: 'INACTIVE' }),
      select: {
        id: true, full_name: true, email: true, number: true, created_at: true,
        role: { select: { name: true } },
        studentProfile: { select: { student_number: true, admission_year: true } },
        lecturerProfile: { select: { specialty: true } }
      },
      orderBy: { created_at: 'asc' }
    });

    res.json({
      message: 'Pending registrations fetched',
      count: pending.length,
      registrations: pending.map(u => ({ ...u, role: u.role.name }))
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch pending registrations', error: e.message });
  }
};

// ─── 6. APPROVE REGISTRATION ─────────────────────────────────────────────────
/**
 * PUT /api/dean/registrations/:id/approve
 */
export const approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertInFaculty(Number(id), facultyId, res);
    if (!existing) return;

    if (existing.status !== 'INACTIVE') {
      return res.status(400).json({ message: `User is already ${existing.status}.` });
    }

    const approved = await prisma.user.update({
      where: { id: Number(id) },
      data: { status: 'ACTIVE' },
      select: { id: true, full_name: true, email: true, status: true }
    });

    res.json({ message: 'Registration approved. User is now ACTIVE.', user: approved });
  } catch (e) {
    res.status(500).json({ message: 'Failed to approve registration', error: e.message });
  }
};

// ─── 7. REJECT REGISTRATION ──────────────────────────────────────────────────
/**
 * PUT /api/dean/registrations/:id/reject
 */
export const rejectRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertInFaculty(Number(id), facultyId, res);
    if (!existing) return;

    if (existing.status !== 'INACTIVE') {
      return res.status(400).json({ message: `User is already ${existing.status}.` });
    }

    const rejected = await prisma.user.update({
      where: { id: Number(id) },
      data: { status: 'SUSPENDED' },
      select: { id: true, full_name: true, email: true, status: true }
    });

    res.json({ message: 'Registration rejected. User has been SUSPENDED.', user: rejected });
  } catch (e) {
    res.status(500).json({ message: 'Failed to reject registration', error: e.message });
  }
};

// ─── 8. ASSIGN STUDENT TO BATCH SECTION ──────────────────────────────────────
/**
 * POST /api/dean/users/:id/assign-section
 * Body: { batchSectionId, academicYearId, semesterId }
 */
export const assignStudentToSection = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { batchSectionId, academicYearId, semesterId } = req.body;
    const { facultyId } = req;

    if (!batchSectionId || !academicYearId || !semesterId) {
      return res.status(400).json({ message: 'batchSectionId, academicYearId, and semesterId are required.' });
    }

    // Verify student is in this faculty
    const student = await prisma.user.findFirst({
      where: { id: Number(studentId), studentProfile: { facultyId } }
    });
    if (!student) {
      return res.status(403).json({ message: 'Student not found in your faculty.' });
    }

    // Verify the batch section belongs to a batch in this faculty's programs
    const section = await prisma.batchSection.findFirst({
      where: {
        id: Number(batchSectionId),
        batch: {
          program: {
            department: { facultyId }
          }
        }
      },
      include: { batch: { include: { program: true } } }
    });
    if (!section) {
      return res.status(403).json({ message: 'Batch section does not belong to your faculty.' });
    }

    // Check if student is already registered in this section
    const existing = await prisma.studentRegistration.findFirst({
      where: { studentId: Number(studentId), batchSectionId: Number(batchSectionId) }
    });
    if (existing) {
      return res.status(409).json({ message: 'Student already assigned to this section.' });
    }

    const registration = await prisma.studentRegistration.create({
      data: {
        studentId: Number(studentId),
        batchSectionId: Number(batchSectionId),
        registrationAcademicYearId: Number(academicYearId),
        currentAcademicYearId: Number(academicYearId),
        currentSemesterId: Number(semesterId)
      },
      include: {
        batchSection: { include: { batch: { include: { program: true } } } },
        currentAcademicYear: true,
        currentSemester: true
      }
    });

    res.status(201).json({
      message: `Student assigned to "${section.name}" in batch "${section.batch.name}"`,
      registration
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to assign student', error: e.message });
  }
};

// ─── 9. GET STUDENT REGISTRATIONS ────────────────────────────────────────────
/**
 * GET /api/dean/users/:id/registrations
 */
export const getStudentRegistrations = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { facultyId } = req;

    const student = await prisma.user.findFirst({
      where: { id: Number(studentId), studentProfile: { facultyId } }
    });
    if (!student) {
      return res.status(403).json({ message: 'Student not in your faculty.' });
    }

    const registrations = await prisma.studentRegistration.findMany({
      where: { studentId: Number(studentId) },
      include: {
        batchSection: {
          include: { batch: { include: { program: true, academicYear: true } } }
        },
        currentAcademicYear: true,
        currentSemester: true
      }
    });

    res.json({ studentId: Number(studentId), registrations });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch registrations', error: e.message });
  }
};
