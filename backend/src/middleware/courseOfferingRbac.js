import {
  fetchOfferingWithScope,
  fetchAssignmentWithOffering,
  canAccessOfferingRead,
  canManageOfferingContent,
  canStudentSubmitToAssignment,
} from "../utils/courseOfferingAccess.js";

export function requireCourseOfferingRead() {
  return async (req, res, next) => {
    const offering = await fetchOfferingWithScope(req.params.courseOfferingId);
    if (!offering) return res.status(404).json({ message: "Course offering not found" });
    if (!(await canAccessOfferingRead(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}

export function requireCourseOfferingManage() {
  return async (req, res, next) => {
    const offering = await fetchOfferingWithScope(req.params.courseOfferingId);
    if (!offering) return res.status(404).json({ message: "Course offering not found" });
    if (!(await canManageOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}

async function loadAssignment(req) {
  const assignment = await fetchAssignmentWithOffering(req.params.assignmentId);
  if (!assignment) return null;
  req.assignment = assignment;
  req.courseOffering = assignment.courseOffering;
  return assignment;
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
