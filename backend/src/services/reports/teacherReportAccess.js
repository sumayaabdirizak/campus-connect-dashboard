import { prisma } from '../../db/prisma.js';
import { isCourseOfferingPublicId } from './courseOfferingPublicId.js';

/** Scopes a lecturer may open — only their own courses / own activity. */
export const TEACHER_REPORT_SCOPES = ['course', 'teacher'];

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

export function isTeacherRole(role) {
  return role === 'TEACHER';
}

export function teacherUserId(req) {
  return Number(req.user?.sub ?? req.user?.id);
}

/**
 * Teachers may only list/view course and teacher reports.
 * @param {string} scope
 * @param {string} role
 */
export function assertTeacherMayUseScope(scope, role) {
  if (!isTeacherRole(role)) return;
  if (!TEACHER_REPORT_SCOPES.includes(scope)) {
    throw forbidden('Teachers can only view course and teacher activity reports');
  }
}

/**
 * Enforce ownership on a single-subject report.
 * @param {{ role?: string }} user
 * @param {string} scope
 * @param {string|number} id
 */
export async function assertTeacherMayViewSubject(user, scope, id) {
  if (!isTeacherRole(user?.role)) return;

  assertTeacherMayUseScope(scope, user.role);
  const userId = Number(user.sub ?? user.id);

  if (scope === 'teacher') {
    if (Number(id) !== userId) {
      throw forbidden('You can only view your own teacher activity report');
    }
    return;
  }

  if (scope === 'course') {
    const pid = String(id ?? '').trim();
    // Avoid Prisma UUID crash when a teacher user id (e.g. "373") is sent as course id.
    if (!isCourseOfferingPublicId(pid)) {
      throw forbidden('You can only view reports for courses you teach');
    }
    const offering = await prisma.courseOffering.findUnique({
      where: { publicId: pid },
      select: { teacherId: true },
    });
    if (!offering || Number(offering.teacherId) !== userId) {
      throw forbidden('You can only view reports for courses you teach');
    }
  }
}
