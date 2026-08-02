import { prisma } from '../../db/prisma.js';
import { respondInternalError } from '../../utils/httpError.js';
import { syncDiscussionMembershipsForUser } from '../../features/discussions/membershipSync.service.js';

async function resolveYearAndSemester(sectionId, body = {}) {
  let academicYearId = body.academicYearId ? Number(body.academicYearId) : null;
  let semesterId = body.semesterId ? Number(body.semesterId) : null;

  const section = await prisma.batchSection.findUnique({
    where: { id: Number(sectionId) },
    include: {
      batch: {
        include: {
          academicYear: { include: { semesters: { orderBy: { sequence: 'asc' } } } }
        }
      }
    }
  });
  if (!section) return { error: { status: 404, message: 'Section not found' } };

  if (!academicYearId) academicYearId = section.batch.academicYearId;
  if (!semesterId) {
    semesterId = section.batch.academicYear?.semesters?.[0]?.id ?? null;
  }
  if (!academicYearId || !semesterId) {
    return {
      error: {
        status: 400,
        message: 'academicYearId and semesterId are required (or batch must have a year with semesters).'
      }
    };
  }

  return { section, academicYearId, semesterId };
}

export async function listSectionStudents(req, res) {
  try {
    const sectionId = Number(req.params.id);
    const registrations = await prisma.studentRegistration.findMany({
      where: { batchSectionId: sectionId, status: 'ACTIVE' },
      include: {
        student: { select: { id: true, full_name: true, email: true, number: true } }
      },
      orderBy: { id: 'asc' }
    });
    res.json({
      students: registrations.map((r) => ({
        registrationId: r.id,
        ...r.student
      }))
    });
  } catch (e) {
    respondInternalError(res, 'Failed to list section students', e);
  }
}

export async function addSectionStudents(req, res) {
  try {
    const sectionId = Number(req.params.id);
    const studentIds = Array.isArray(req.body?.studentIds)
      ? req.body.studentIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    if (studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required' });
    }

    const resolved = await resolveYearAndSemester(sectionId, req.body);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }
    const { academicYearId, semesterId } = resolved;

    const students = await prisma.user.findMany({
      where: { id: { in: studentIds }, role: { name: 'STUDENT' } },
      select: { id: true }
    });
    if (students.length === 0) {
      return res.status(400).json({ message: 'No valid students found' });
    }

    const added = [];
    const skipped = [];

    for (const { id: studentId } of students) {
      const existing = await prisma.studentRegistration.findFirst({
        where: { studentId, batchSectionId: sectionId }
      });
      if (existing) {
        skipped.push(studentId);
        continue;
      }

      await prisma.studentRegistration.deleteMany({
        where: { studentId, batchSectionId: { not: sectionId } }
      });

      await prisma.studentRegistration.create({
        data: {
          studentId,
          batchSectionId: sectionId,
          registrationAcademicYearId: academicYearId,
          currentAcademicYearId: academicYearId,
          currentSemesterId: semesterId
        }
      });

      try {
        await syncDiscussionMembershipsForUser(studentId);
      } catch (err) {
        console.error('membership sync failed', { studentId, error: err?.message });
      }
      added.push(studentId);
    }

    res.status(201).json({
      message: `Added ${added.length} student(s) to section`,
      added,
      skipped
    });
  } catch (e) {
    respondInternalError(res, 'Failed to add students to section', e);
  }
}

export async function removeSectionStudent(req, res) {
  try {
    const sectionId = Number(req.params.id);
    const studentId = Number(req.params.studentId);
    const deleted = await prisma.studentRegistration.deleteMany({
      where: { batchSectionId: sectionId, studentId }
    });
    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Student not in this section' });
    }
    try {
      await syncDiscussionMembershipsForUser(studentId);
    } catch (err) {
      console.error('membership sync failed', { studentId, error: err?.message });
    }
    res.json({ message: 'Student removed from section' });
  } catch (e) {
    respondInternalError(res, 'Failed to remove student from section', e);
  }
}
