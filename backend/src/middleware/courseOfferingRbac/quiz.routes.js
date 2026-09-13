import {
  fetchQuizWithOffering,
  fetchQuizQuestionWithOffering,
  fetchQuizAttemptWithOffering,
  canAccessOfferingRead,
  canManageOfferingContent,
  canStudentTakeQuiz,
} from "../../utils/courseOfferingAccess.js";

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

export function requireQuizAttemptAccess() {
  return async (req, res, next) => {
    const attempt = await loadAttempt(req);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    const offering = attempt.quiz.courseOffering;
    const isOwner =
      req.user?.role === "STUDENT" &&
      Number(attempt.studentId) === Number(req.user.id ?? req.user.sub);
    if (isOwner) return next();
    if (await canManageOfferingContent(req.user, offering)) return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}

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
