import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import { syncDiscussionMembershipsForUser } from '../../features/discussions/membershipSync.service.js';

async function loadCourse(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: Number(courseId) },
    select: { id: true, name: true, code: true, departmentId: true },
  });
  if (!course) throw new HttpError(404, 'Course not found', null);
  return course;
}

async function loadTeacher(teacherId) {
  const teacher = await prisma.user.findFirst({
    where: {
      id: Number(teacherId),
      role: { name: 'TEACHER' },
      lecturerProfile: { isNot: null },
    },
    select: { id: true, full_name: true, email: true },
  });
  if (!teacher) throw new HttpError(400, 'Teacher not found or not a lecturer.', null);
  return teacher;
}

/** GET /api/courses/:id/teachers */
export async function listCourseTeachers(req, res) {
  await loadCourse(req.params.id);
  const assignings = await prisma.teacherAssigning.findMany({
    where: { courseId: Number(req.params.id) },
    include: {
      teacher: { select: { id: true, full_name: true, email: true, number: true } },
    },
    orderBy: { assigned_at: 'desc' },
  });
  res.json({
    message: 'Course teachers',
    teachers: assignings.map((a) => ({
      assignmentId: a.id,
      assigned_at: a.assigned_at,
      ...a.teacher,
    })),
  });
}

/** POST /api/courses/:id/teachers  body: { teacherId } */
export async function assignCourseTeacher(req, res) {
  const courseId = Number(req.params.id);
  const teacherId = Number(req.body?.teacherId);
  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    throw new HttpError(400, 'teacherId is required.', null);
  }

  await loadCourse(courseId);
  await loadTeacher(teacherId);

  try {
    const assignment = await prisma.teacherAssigning.create({
      data: { teacherId, courseId },
      include: {
        teacher: { select: { id: true, full_name: true, email: true } },
        course: { select: { id: true, name: true, code: true } },
      },
    });

    try {
      await syncDiscussionMembershipsForUser(teacherId);
    } catch (err) {
      console.error('Discussion sync after course assign failed', err?.message);
    }

    res.status(201).json({ message: 'Teacher assigned to course', assignment });
  } catch (e) {
    if (e?.code === 'P2002') {
      throw new HttpError(409, 'Teacher is already assigned to this course.', null);
    }
    throw e;
  }
}

/** DELETE /api/courses/:id/teachers/:teacherId */
export async function removeCourseTeacher(req, res) {
  const courseId = Number(req.params.id);
  const teacherId = Number(req.params.teacherId);
  await loadCourse(courseId);

  const record = await prisma.teacherAssigning.findFirst({
    where: { courseId, teacherId },
  });
  if (!record) throw new HttpError(404, 'Teacher assignment not found.', null);

  await prisma.teacherAssigning.delete({ where: { id: record.id } });

  try {
    await syncDiscussionMembershipsForUser(teacherId);
  } catch (err) {
    console.error('Discussion sync after course unassign failed', err?.message);
  }

  res.json({ message: 'Teacher removed from course.' });
}
