import {
  fetchAssignmentWithOffering,
  canManageOfferingContent,
  canAccessOfferingRead,
  canStudentSubmitToAssignment,
} from "../../utils/courseOfferingAccess.js";

async function loadAssignment(req) {
  const assignment = await fetchAssignmentWithOffering(req.params.assignmentId);
  if (!assignment) return null;
  req.assignment = assignment;
  req.courseOffering = assignment.courseOffering;
  return assignment;
}

/** Anyone who can read the offering (teacher, enrolled student, scoped admin). */
export function requireAssignmentCourseRead() {
  return async (req, res, next) => {
    const assignment = await loadAssignment(req);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canAccessOfferingRead(req.user, assignment.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requireAssignmentManage() {
  return async (req, res, next) => {
    const assignment = await loadAssignment(req);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageOfferingContent(req.user, assignment.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requireAssignmentSubmissionsRead() {
  return async (req, res, next) => {
    const assignment = await loadAssignment(req);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageOfferingContent(req.user, assignment.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requireStudentSubmission() {
  return async (req, res, next) => {
    const assignment = await loadAssignment(req);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    const offering = assignment.courseOffering;
    if (!(await canStudentSubmitToAssignment(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.assignment = assignment;
    req.courseOffering = offering;
    next();
  };
}

export function requireSubmissionGrade() {
  return async (req, res, next) => {
    const assignment = await loadAssignment(req);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageOfferingContent(req.user, assignment.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/** Teacher attachment download: any offering reader (teacher, enrolled student, scoped admin). */
export function requireAssignmentAttachmentRead() {
  return async (req, res, next) => {
    const { prisma } = await import("../../db/prisma.js");
    const attachmentId = parseInt(req.params.attachmentId, 10);
    if (!Number.isFinite(attachmentId)) {
      return res.status(404).json({ message: "Not found" });
    }
    const att = await prisma.assignmentAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, assignmentId: true },
    });
    if (!att) return res.status(404).json({ message: "Not found" });

    const assignment = await fetchAssignmentWithOffering(att.assignmentId);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    req.assignmentAttachment = att;
    req.assignment = assignment;
    req.courseOffering = assignment.courseOffering;

    if (!(await canAccessOfferingRead(req.user, assignment.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/**
 * Submission file: course manager, owning student, or group member.
 * Expects :assignmentId + :submissionId.
 */
export function requireSubmissionFileAccess() {
  return async (req, res, next) => {
    const { prisma } = await import("../../db/prisma.js");
    const assignment = await loadAssignment(req);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    const submissionId = parseInt(req.params.submissionId, 10);
    if (!Number.isFinite(submissionId)) {
      return res.status(404).json({ message: "Not found" });
    }
    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, assignmentId: assignment.id },
    });
    if (!submission) return res.status(404).json({ message: "Not found" });

    req.submission = submission;
    req.assignment = assignment;
    req.courseOffering = assignment.courseOffering;

    if (await canManageOfferingContent(req.user, assignment.courseOffering)) {
      return next();
    }

    const userId = Number(req.user.sub ?? req.user.id);
    if (submission.studentId === userId) return next();

    if (submission.groupId != null) {
      const member = await prisma.groupMember.findFirst({
        where: { groupId: submission.groupId, memberId: userId },
        select: { id: true },
      });
      if (member) return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  };
}
