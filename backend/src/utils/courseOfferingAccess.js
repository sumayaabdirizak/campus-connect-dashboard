import { prisma } from "../db/prisma.js";
import { getAuthFacultyId } from "./facultyAccess.js";

const COURSE_OFFERING_PUBLIC_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {unknown} value */
export function isCourseOfferingPublicId(value) {
  return typeof value === "string" && COURSE_OFFERING_PUBLIC_ID_RE.test(value);
}

/** @param {unknown} identifier Route param or socket payload (UUID or legacy numeric id). */
export function courseOfferingWhereFromParam(identifier) {
  if (isCourseOfferingPublicId(identifier)) {
    return { publicId: identifier };
  }
  const id = Number(identifier);
  if (Number.isFinite(id) && id > 0) {
    return { id };
  }
  return null;
}

/** Client-facing course URL path segment (UUID). */
export function courseOfferingDashboardPath(publicId, tab) {
  const base = `/dashboard/courses/${publicId}`;
  return tab ? `${base}?tab=${tab}` : base;
}

/** Socket.IO room name for a course offering (uses public UUID). */
export function courseOfferingRoomName(offeringOrPublicId) {
  const publicId =
    typeof offeringOrPublicId === "string"
      ? offeringOrPublicId
      : offeringOrPublicId?.publicId;
  return publicId ? `course_${publicId}` : null;
}

const OFFERING_SCOPE_INCLUDE = {
  section: {
    include: {
      batch: {
        include: {
          program: { include: { department: true } },
        },
      },
    },
  },
  course: { include: { department: true } },
};

/**
 * @param {import("@prisma/client").CourseOffering & {
 *   section?: import("@prisma/client").BatchSection & {
 *     batch?: import("@prisma/client").Batch & {
 *       program?: import("@prisma/client").Program & { department?: import("@prisma/client").Department };
 *     };
 *   };
 * }} offering
 */
export function offeringFacultyId(offering) {
  return offering?.section?.batch?.program?.department?.facultyId ?? null;
}

export async function fetchOfferingWithScope(identifier) {
  const where = courseOfferingWhereFromParam(identifier);
  if (!where) return null;
  return prisma.courseOffering.findUnique({
    where,
    include: OFFERING_SCOPE_INCLUDE,
  });
}

/// Shared offering-include shape so quiz/attempt/question lookups all return
/// the same faculty-scoped data the canAccess* helpers expect.
const OFFERING_INCLUDE = OFFERING_SCOPE_INCLUDE;

export async function fetchQuizWithOffering(quizId) {
  const id = Number(quizId);
  if (!Number.isFinite(id)) return null;
  return prisma.quiz.findUnique({
    where: { id },
    include: { courseOffering: { include: OFFERING_INCLUDE } },
  });
}

export async function fetchQuizQuestionWithOffering(questionId) {
  const id = Number(questionId);
  if (!Number.isFinite(id)) return null;
  return prisma.quizQuestion.findUnique({
    where: { id },
    include: {
      quiz: { include: { courseOffering: { include: OFFERING_INCLUDE } } },
    },
  });
}

export async function fetchQuizAttemptWithOffering(attemptId) {
  const id = Number(attemptId);
  if (!Number.isFinite(id)) return null;
  return prisma.quizAttempt.findUnique({
    where: { id },
    include: {
      quiz: { include: { courseOffering: { include: OFFERING_INCLUDE } } },
    },
  });
}

export async function fetchAssignmentWithOffering(assignmentId) {
  const id = Number(assignmentId);
  if (!Number.isFinite(id)) return null;
  return prisma.assignment.findUnique({
    where: { id },
    include: {
      courseOffering: {
        include: {
          section: {
            include: {
              batch: {
                include: {
                  program: { include: { department: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function studentInSection(studentUserId, sectionId) {
  const reg = await prisma.studentRegistration.findFirst({
    where: { studentId: studentUserId, batchSectionId: sectionId },
  });
  return !!reg;
}

/**
 * Read assignments / offering metadata: super admin, dean/faculty admin of faculty,
 * assigned teacher, or enrolled student.
 */
export async function canAccessOfferingRead(user, offering) {
  if (!user?.role || !offering) return false;
  const role = user.role;
  const fid = offeringFacultyId(offering);
  const authFid = getAuthFacultyId(user);

  if (role === "SUPER_ADMIN") return true;
  if ((role === "DEAN" || role === "FACULTY_ADMIN") && authFid != null && fid === authFid) return true;
  if (role === "TEACHER" && offering.teacherId === user.sub) return true;
  if (role === "STUDENT") return studentInSection(user.sub, offering.sectionId);
  return false;
}

/** Create/update/delete assignments; grade submissions. */
export async function canManageOfferingContent(user, offering) {
  if (!user?.role || !offering) return false;
  const role = user.role;
  const fid = offeringFacultyId(offering);
  const authFid = getAuthFacultyId(user);

  if (role === "SUPER_ADMIN") return true;
  if ((role === "DEAN" || role === "FACULTY_ADMIN") && authFid != null && fid === authFid) return true;
  if (role === "TEACHER" && offering.teacherId === user.sub) return true;
  return false;
}

/**
 * Read-access check for the socket layer, whose authenticated user has a
 * different shape than the HTTP `req.user`: `{ id, role, facultyIds[],
 * sectionIds[], ... }` (no `sub`, no scalar `facultyId`). Mirrors
 * `canAccessOfferingRead` but resolves scope from the array fields, so it
 * needs no extra DB round-trip for students/admins.
 *
 * @param {{ id: number, role: string, facultyIds?: number[], sectionIds?: number[] }} socketUser
 * @param {import("@prisma/client").CourseOffering} offering offering with section→…→department scope loaded
 */
export function canSocketUserReadOffering(socketUser, offering) {
  if (!socketUser?.role || !offering) return false;
  const role = socketUser.role;
  const uid = Number(socketUser.id);
  const fid = offeringFacultyId(offering);

  if (role === "SUPER_ADMIN") return true;
  if (role === "DEAN" || role === "FACULTY_ADMIN") {
    return fid != null && (socketUser.facultyIds ?? []).map(Number).includes(Number(fid));
  }
  if (role === "TEACHER") return offering.teacherId === uid;
  if (role === "STUDENT") {
    return (socketUser.sectionIds ?? []).map(Number).includes(Number(offering.sectionId));
  }
  return false;
}

export async function canStudentSubmitToAssignment(user, offering) {
  if (user.role !== "STUDENT") return false;
  return studentInSection(user.sub, offering.sectionId);
}

/// Same shape as canStudentSubmitToAssignment but for quizzes — student must
/// be enrolled in the offering's section to start / submit an attempt.
export async function canStudentTakeQuiz(user, offering) {
  if (user?.role !== "STUDENT") return false;
  return studentInSection(user.sub, offering.sectionId);
}
