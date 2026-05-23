import { prisma } from "../db/prisma.js";
import { getAuthFacultyId } from "./facultyAccess.js";

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

export async function fetchOfferingWithScope(courseOfferingId) {
  const id = Number(courseOfferingId);
  if (!Number.isFinite(id)) return null;
  return prisma.courseOffering.findUnique({
    where: { id },
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
      course: { include: { department: true } },
    },
  });
}

/// Shared offering-include shape so quiz/attempt/question lookups all return
/// the same faculty-scoped data the canAccess* helpers expect.
const OFFERING_INCLUDE = {
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
