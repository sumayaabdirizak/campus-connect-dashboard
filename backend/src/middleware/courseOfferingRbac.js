import {
  fetchOfferingWithScope,
  fetchAssignmentWithOffering,
  fetchQuizWithOffering,
  fetchQuizQuestionWithOffering,
  fetchQuizAttemptWithOffering,
  canAccessOfferingRead,
  canManageOfferingContent,
  canStudentSubmitToAssignment,
  canStudentTakeQuiz,
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

// ─── Quiz scoping ─────────────────────────────────────────────────────────────
// Mirrors the assignment helpers: load the quiz / question / attempt, derive
// the parent offering, then defer to the existing access policy.

async function loadQuiz(req) {
  const quiz = await fetchQuizWithOffering(req.params.quizId);
  if (!quiz) return null;
  req.quiz = quiz;
  req.courseOffering = quiz.courseOffering;
  return quiz;
}

async function loadQuestion(req) {
  const question = await fetchQuizQuestionWithOffering(req.params.questionId);
  if (!question) return null;
  req.quizQuestion = question;
  req.quiz = question.quiz;
  req.courseOffering = question.quiz.courseOffering;
  return question;
}

async function loadAttempt(req) {
  const attempt = await fetchQuizAttemptWithOffering(req.params.attemptId);
  if (!attempt) return null;
  req.quizAttempt = attempt;
  req.quiz = attempt.quiz;
  req.courseOffering = attempt.quiz.courseOffering;
  return attempt;
}

/// Teacher-level write access on a quiz scoped by `:quizId`.
export function requireQuizManage() {
  return async (req, res, next) => {
    const quiz = await loadQuiz(req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (!(await canManageOfferingContent(req.user, quiz.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Read access on a quiz — same policy as the offering (teachers + enrolled
/// students see it; everyone else gets 403).
export function requireQuizRead() {
  return async (req, res, next) => {
    const quiz = await loadQuiz(req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (!(await canAccessOfferingRead(req.user, quiz.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Teacher-level write access scoped by `:questionId`.
export function requireQuizQuestionManage() {
  return async (req, res, next) => {
    const question = await loadQuestion(req);
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (!(await canManageOfferingContent(req.user, question.quiz.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Student starting / submitting a quiz attempt. Must be enrolled in the
/// offering's section.
export function requireStudentQuizAccess() {
  return async (req, res, next) => {
    const quiz = await loadQuiz(req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (!(await canStudentTakeQuiz(req.user, quiz.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Either the student who owns the attempt, or a teacher managing the
/// offering. Used for "view my attempt" / "grade student attempt" endpoints.
export function requireQuizAttemptAccess() {
  return async (req, res, next) => {
    const attempt = await loadAttempt(req);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    const offering = attempt.quiz.courseOffering;
    const isOwner = req.user?.role === "STUDENT" && attempt.studentId === req.user.sub;
    if (isOwner) return next();
    if (await canManageOfferingContent(req.user, offering)) return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}

/// Teacher-only access to an attempt (grading short answers, etc.).
export function requireQuizAttemptManage() {
  return async (req, res, next) => {
    const attempt = await loadAttempt(req);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (!(await canManageOfferingContent(req.user, attempt.quiz.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
