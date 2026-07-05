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
    const isOwner =
      req.user?.role === "STUDENT" &&
      Number(attempt.studentId) === Number(req.user.id ?? req.user.sub);
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

// ─── Course-post (Feed tab) scoping ───────────────────────────────────────────
// Loads the parent post and the offering it belongs to, then enforces the
// same read-policy as the offering itself. Used for sub-resource routes
// (replies / reactions / attachments / patch / delete) that take a
// `:postId` path param instead of `:courseOfferingId` — without this
// middleware any authenticated user could PATCH/DELETE/reply-to posts in
// courses they're not enrolled in (IDOR).
//
// Co-located here rather than as its own file so all course-membership
// gates live together — easier to audit "which middleware are we missing
// on which route" in one pass.
//
// We import `prisma` lazily inside the closure to avoid creating a cycle
// (this file is imported by every controller; prisma loads many models).
async function loadCoursePostBySomeId(req) {
  const { prisma } = await import("../db/prisma.js");
  let postId = null;
  if (req.params.postId) {
    postId = parseInt(req.params.postId, 10);
  } else if (req.params.replyId) {
    const reply = await prisma.coursePostReply.findUnique({
      where: { id: parseInt(req.params.replyId, 10) },
      select: { postId: true },
    });
    postId = reply?.postId ?? null;
  } else if (req.params.attachmentId) {
    const att = await prisma.coursePostAttachment.findUnique({
      where: { id: parseInt(req.params.attachmentId, 10) },
      select: { postId: true },
    });
    postId = att?.postId ?? null;
  }
  if (!Number.isInteger(postId)) return null;
  const post = await prisma.coursePost.findUnique({
    where: { id: postId },
    include: { courseOffering: { include: { course: { select: { id: true, code: true } } } } },
  });
  if (!post) return null;
  req.coursePost = post;
  req.courseOffering = post.courseOffering;
  return post;
}

/// Any enrolled member of the course can interact with posts in it (read
/// the body, react, reply). Use this for the "join in on the discussion"
/// routes. Author-only operations (edit, delete) layer their own check
/// on top of this.
export function requireCoursePostRead() {
  return async (req, res, next) => {
    const post = await loadCoursePostBySomeId(req);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!(await canAccessOfferingRead(req.user, post.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// ─── Chat-message scoping ─────────────────────────────────────────────────────
// Routes that take `:messageId` (PATCH/DELETE/attachment-upload) need to
// confirm the requester is a member of the parent course before any handler
// logic runs. Without this gate an authenticated user from another faculty
// could PATCH/DELETE messages in courses they aren't enrolled in, since the
// author-check inside the handler returns 403 — leaking the existence of
// the message and the room's parent offering.
async function loadChatMessageById(req) {
  const { prisma } = await import("../db/prisma.js");
  const messageId = parseInt(req.params.messageId, 10);
  if (!Number.isInteger(messageId)) return null;
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { room: { select: { courseOfferingId: true } } },
  });
  if (!message || !message.room?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(message.room.courseOfferingId);
  if (!offering) return null;
  req.chatMessage = message;
  req.courseOffering = offering;
  return { message, offering };
}

/// Read-policy scoped by `:messageId`. Layered above the existing in-handler
/// author check — both must pass to mutate a message.
export function requireChatMessageRead() {
  return async (req, res, next) => {
    const loaded = await loadChatMessageById(req);
    if (!loaded) return res.status(404).json({ message: "Message not found" });
    if (!(await canAccessOfferingRead(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// ─── Resource / Module scoping (write-side) ───────────────────────────────────
// PATCH/DELETE on `:resourceId` and `:moduleId`, plus the bulk reorder
// endpoints. The reorder routes don't have a path param — we sniff the
// first item in the request body to derive the offering and assume the
// rest belong to the same offering (the frontend never mixes). The
// per-item transaction is still scoped by id, so a malicious client that
// sneaks foreign ids in would only flip rows it can't read; this gate
// catches the common case and stops the obvious IDOR pivot.
async function loadResourceById(req) {
  const { prisma } = await import("../db/prisma.js");
  const id = parseInt(req.params.resourceId, 10);
  if (!Number.isInteger(id)) return null;
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { id: true, courseOfferingId: true },
  });
  if (!resource?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(resource.courseOfferingId);
  if (!offering) return null;
  req.resourceRecord = resource;
  req.courseOffering = offering;
  return { resource, offering };
}

async function loadModuleById(req) {
  const { prisma } = await import("../db/prisma.js");
  const id = parseInt(req.params.moduleId, 10);
  if (!Number.isInteger(id)) return null;
  const courseModule = await prisma.courseModule.findUnique({
    where: { id },
    select: { id: true, courseOfferingId: true },
  });
  if (!courseModule?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(courseModule.courseOfferingId);
  if (!offering) return null;
  req.courseModuleRecord = courseModule;
  req.courseOffering = offering;
  return { courseModule, offering };
}

/// Teacher-level write access scoped by `:resourceId`.
export function requireResourceManage() {
  return async (req, res, next) => {
    const loaded = await loadResourceById(req);
    if (!loaded) return res.status(404).json({ message: "Resource not found" });
    if (!(await canManageOfferingContent(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Read-scope access scoped by `:resourceId` — any enrolled course member
/// (student or managing teacher) passes. Used for watch-progress heartbeats
/// and "my progress" reads, where the requester is the student themselves.
export function requireResourceRead() {
  return async (req, res, next) => {
    const loaded = await loadResourceById(req);
    if (!loaded) return res.status(404).json({ message: "Resource not found" });
    if (!(await canAccessOfferingRead(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Teacher-level write access scoped by `:moduleId`.
export function requireModuleManage() {
  return async (req, res, next) => {
    const loaded = await loadModuleById(req);
    if (!loaded) return res.status(404).json({ message: "Module not found" });
    if (!(await canManageOfferingContent(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Bulk-reorder gate for resources. Assumes all items in `req.body.items`
/// belong to the same offering (frontend invariant) — we fetch the first
/// item's offering and run the manage check against that. If the request
/// is empty we let it through so the handler can no-op cleanly.
export function requireResourceReorderManage() {
  return async (req, res, next) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return next();
    const { prisma } = await import("../db/prisma.js");
    const firstId = Number(items[0]?.id);
    if (!Number.isInteger(firstId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const first = await prisma.resource.findUnique({
      where: { id: firstId },
      select: { courseOfferingId: true },
    });
    if (!first?.courseOfferingId) return res.status(404).json({ message: "Resource not found" });
    const offering = await fetchOfferingWithScope(first.courseOfferingId);
    if (!offering || !(await canManageOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}

/// Bulk-reorder gate for modules. Same assumption as the resource reorder
/// helper: all items belong to one offering.
export function requireModuleReorderManage() {
  return async (req, res, next) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return next();
    const { prisma } = await import("../db/prisma.js");
    const firstId = Number(items[0]?.id);
    if (!Number.isInteger(firstId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const first = await prisma.courseModule.findUnique({
      where: { id: firstId },
      select: { courseOfferingId: true },
    });
    if (!first?.courseOfferingId) return res.status(404).json({ message: "Module not found" });
    const offering = await fetchOfferingWithScope(first.courseOfferingId);
    if (!offering || !(await canManageOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}

// ─── Study-group scoping ──────────────────────────────────────────────────────
// Group deletion is a teacher-only op. Member add/remove is self-service for
// any enrolled course member (matches the existing in-handler behaviour of
// "any course member can join/leave a group"). We split into two helpers
// so callers stay explicit about which policy they want.
async function loadGroupById(req) {
  const { prisma } = await import("../db/prisma.js");
  const id = parseInt(req.params.groupId, 10);
  if (!Number.isInteger(id)) return null;
  const group = await prisma.courseGroup.findUnique({
    where: { id },
    select: { id: true, courseOfferingId: true },
  });
  if (!group?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(group.courseOfferingId);
  if (!offering) return null;
  req.studyGroup = group;
  req.courseOffering = offering;
  return { group, offering };
}

/// Teacher-only write access on a study group (delete the group itself).
export function requireStudyGroupManage() {
  return async (req, res, next) => {
    const loaded = await loadGroupById(req);
    if (!loaded) return res.status(404).json({ message: "Group not found" });
    if (!(await canManageOfferingContent(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/// Read-scope access on a study group — any enrolled course member can
/// pass. Use this for self-service member add / leave routes where the
/// handler still needs to authorise the *specific* mutation.
export function requireStudyGroupAccess() {
  return async (req, res, next) => {
    const loaded = await loadGroupById(req);
    if (!loaded) return res.status(404).json({ message: "Group not found" });
    if (!(await canAccessOfferingRead(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
