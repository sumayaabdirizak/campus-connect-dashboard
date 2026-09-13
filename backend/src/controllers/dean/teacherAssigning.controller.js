import { prisma } from '../../db/prisma.js';
import { respondInternalError } from '../../utils/httpError.js';
import { namedListSuccess } from '../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../utils/pagination.js';
import {
  getFacultyProgramIds,
  assertFacultyTeacher,
} from './teacherAssigning.helpers.js';

// ─── 1. LIST TEACHERS IN FACULTY ─────────────────────────────────────────────
/**
 * GET /api/dean/teachers
 * Query: search, departmentId
 */
export const getFacultyTeachers = async (req, res) => {
  try {
    const { facultyId } = req;
    const { search, departmentId } = req.query;
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const where = {
      lecturerProfile: {
        faculties: { some: { facultyId } },
        ...(departmentId ? { departmentId: Number(departmentId) } : {}),
      },
      ...(search ? {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { number: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [totalCount, teachers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
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
              faculties: {
                include: { faculty: { select: { id: true, name: true, code: true } } },
              },
            },
          },
          teacherAssignings: {
            select: {
              id: true,
              course: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { full_name: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    const mapped = teachers.map((t) => ({
      ...t,
      role: t.role.name,
      totalAssignments: t.teacherAssignings.length,
    }));

    res.json(
      namedListSuccess({
        message: 'Faculty teachers fetched',
        name: 'teachers',
        items: mapped,
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (e) {
    respondInternalError(res, 'Failed to fetch teachers', e);
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
          include: { faculties: { include: { faculty: true } } },
        },
        teacherAssignings: {
          include: {
            course: {
              include: {
                offerings: { include: { section: true, semester: true } },
              },
            },
          },
        },
      },
    });

    res.json({ teacher: { ...full, role: full.role.name } });
  } catch (e) {
    respondInternalError(res, 'Failed to fetch teacher', e);
  }
};

// ─── 3-6. DEPRECATED ASSIGNMENT ENDPOINTS ───────────────────────────────────
export const getFacultyAssignments = async (_req, res) => {
  res.status(410).json({ message: 'This endpoint is deprecated. Use /api/dean/offerings instead.' });
};

export const createTeacherAssignment = async (_req, res) => {
  res.status(410).json({ message: 'This endpoint is deprecated. Use /api/dean/courses/:id/teachers instead.' });
};

export const updateTeacherAssignment = async (_req, res) => {
  res.status(410).json({ message: 'Deprecated. Modify courses or offerings instead.' });
};

export const deleteTeacherAssignment = async (_req, res) => {
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
        teacherAssignings: { none: {} },
      },
      select: {
        id: true, full_name: true, email: true, number: true,
        lecturerProfile: { select: { specialty: true } },
      },
    });
    res.json({ message: 'Unassigned teachers fetched', count: teachers.length, teachers });
  } catch (e) {
    respondInternalError(res, 'Failed to fetch unassigned teachers', e);
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
        offerings: { none: {} },
      },
      include: {
        batch: { include: { program: true, academicYear: true } },
        _count: { select: { studentRegistrations: true } },
      },
    });

    res.json({ message: 'Sections without teacher fetched', count: sections.length, sections });
  } catch (e) {
    respondInternalError(res, 'Failed to fetch unassigned sections', e);
  }
};
