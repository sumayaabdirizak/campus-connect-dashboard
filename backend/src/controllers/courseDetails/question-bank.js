import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validateRequest.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireQuizManage,
} from "../../middleware/courseOfferingRbac.js";
import {
  createBankQuestionBodySchema,
  patchBankQuestionBodySchema,
  importBankQuestionsBodySchema,
  importToQuizBodySchema,
  generateQuestionsBodySchema,
} from "../../validation/questionBankSchemas.js";
import {
  generateQuizQuestions,
  isAiEnabled,
} from "../../services/aiQuestionGenerator.service.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Question Bank — per-offering reusable question store.
//
// Mount point (see app.js): /api/question-bank
//
// Route surface, all offering-scoped:
//   GET    /:courseOfferingId                 — list (filters: topic, difficulty, search, moduleId)
//   GET    /:courseOfferingId/topics          — unique topic counts for the filter dropdown
//   POST   /:courseOfferingId                 — create one question + its options
//   POST   /:courseOfferingId/import          — bulk import (CSV pre-parsed client-side)
//   POST   /:courseOfferingId/import/:quizId  — copy N bank questions into an existing quiz
//   PATCH  /:courseOfferingId/:questionId     — edit
//   DELETE /:courseOfferingId/:questionId     — soft delete (is_active = false)
//
// Route-order rule observed: every literal segment (`/topics`, `/import`,
// `/import/:quizId`) is declared BEFORE the bare `/:questionId` so Express's
// in-order matcher doesn't swallow them. The old controller had `/topics`
// after `/:id`, which routed every topics-list call to the 404 lookup-by-id
// handler — a real bug we're fixing here.
//
// RBAC: read endpoints use `requireCourseOfferingRead` (students never reach
// this controller — there's no student-side UI), and mutate endpoints use
// `requireCourseOfferingManage`. The "import to quiz" route uses
// `requireQuizManage` on the target quiz (the offering scope is asserted
// transitively: the picker can only show bank rows from the quiz's offering,
// and the import handler re-asserts that before copying).
// ─────────────────────────────────────────────────────────────────────────────

/// Lightweight `include` shape for every list / detail response. Sorting
/// options by `order_index` so MCQ alphabetisation matches what the teacher
/// authored (the picker on the frontend relies on stable order).
const QUESTION_INCLUDE = {
  bankOptions: { orderBy: { order_index: "asc" } },
  module: { select: { id: true, title: true, position: true, publishedAt: true } },
};

/// Helper: assert a CourseModule lives in the given offering before we link
/// to it. Returns the resolved id, `null`, or `undefined` (when the caller
/// didn't supply the field). Throws a 400-shaped error otherwise.
async function resolveModuleIdForOffering(rawModuleId, courseOfferingId) {
  if (rawModuleId === undefined) return undefined;
  if (rawModuleId === null) return null;
  const mod = await prisma.courseModule.findUnique({
    where: { id: Number(rawModuleId) },
    select: { id: true, courseOfferingId: true },
  });
  if (!mod || mod.courseOfferingId !== courseOfferingId) {
    const err = new Error("Module does not belong to this course");
    err.status = 400;
    throw err;
  }
  return mod.id;
}

// ─── List ────────────────────────────────────────────────────────────────────

router.get(
  "/:courseOfferingId",
  auth,
  requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const cid = parseInt(req.params.courseOfferingId, 10);
    const { topic, difficulty, moduleId, search } = req.query;

    const where = {
      courseOfferingId: cid,
      is_active: true,
    };
    if (topic) where.topic = String(topic);
    if (difficulty) where.difficulty = String(difficulty);
    if (moduleId === "none") {
      where.moduleId = null;
    } else if (moduleId) {
      where.moduleId = Number(moduleId);
    }
    if (search && String(search).trim()) {
      where.question_text = { contains: String(search).trim(), mode: "insensitive" };
    }

    const questions = await prisma.question.findMany({
      where,
      include: QUESTION_INCLUDE,
      orderBy: { created_at: "desc" },
    });
    res.json(questions);
  })
);

// ─── Distinct topics (literal segment — MUST come before /:questionId) ───────

router.get(
  "/:courseOfferingId/topics",
  auth,
  requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const cid = parseInt(req.params.courseOfferingId, 10);
    const rows = await prisma.question.groupBy({
      by: ["topic"],
      where: {
        courseOfferingId: cid,
        is_active: true,
        topic: { not: null },
      },
      _count: { topic: true },
    });
    // Drop the inevitable `{ topic: null }` group Postgres produces even with
    // the where-filter when no rows match, and re-shape to the small
    // { name, count } payload the picker dropdown wants.
    res.json(
      rows
        .filter((r) => r.topic)
        .map((r) => ({ name: r.topic, count: r._count.topic }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  })
);

// ─── Create one ─────────────────────────────────────────────────────────────

router.post(
  "/:courseOfferingId",
  auth,
  requireCourseOfferingManage(),
  validateBody(createBankQuestionBodySchema),
  asyncHandler(async (req, res) => {
    const cid = parseInt(req.params.courseOfferingId, 10);
    const teacherId = req.user.id ?? req.user.sub;
    const { question_text, question_type, points, topic, difficulty, options, moduleId } =
      req.body;

    let resolvedModuleId;
    try {
      resolvedModuleId = await resolveModuleIdForOffering(moduleId, cid);
    } catch (e) {
      return res.status(e.status || 400).json({ message: e.message });
    }

    const created = await prisma.question.create({
      data: {
        question_text,
        question_type: question_type || "MCQ",
        points: points ?? 1,
        topic: topic || null,
        difficulty: difficulty || null,
        courseOfferingId: cid,
        moduleId: resolvedModuleId ?? null,
        created_by: teacherId,
        bankOptions: options?.length
          ? {
              create: options.map((opt, idx) => ({
                option_text: opt.option_text,
                is_correct: !!opt.is_correct,
                order_index: opt.order_index ?? idx,
              })),
            }
          : undefined,
      },
      include: QUESTION_INCLUDE,
    });

    res.status(201).json(created);
  })
);

// ─── Bulk import (CSV pre-parsed on the client) ─────────────────────────────

router.post(
  "/:courseOfferingId/import",
  auth,
  requireCourseOfferingManage(),
  validateBody(importBankQuestionsBodySchema),
  asyncHandler(async (req, res) => {
    const cid = parseInt(req.params.courseOfferingId, 10);
    const teacherId = req.user.id ?? req.user.sub;
    const { questions } = req.body;

    // Resolve every moduleId up front so a partial failure halfway through a
    // 200-row import doesn't leave the bank in a weird state. If ANY row has
    // a bad module link, we reject the whole batch — teacher can fix the
    // file and re-upload.
    const resolvedModuleIds = [];
    for (const q of questions) {
      try {
        resolvedModuleIds.push(await resolveModuleIdForOffering(q.moduleId, cid));
      } catch (e) {
        return res.status(e.status || 400).json({ message: e.message });
      }
    }

    // Bulk insert in one transaction so the import is atomic — the teacher
    // never sees "half the file got imported, half didn't". Per-row nested
    // option creates are still fine; Prisma fans them out under the hood.
    const created = await prisma.$transaction(
      questions.map((q, i) =>
        prisma.question.create({
          data: {
            question_text: q.question_text,
            question_type: q.question_type || "MCQ",
            points: q.points ?? 1,
            topic: q.topic || null,
            difficulty: q.difficulty || null,
            courseOfferingId: cid,
            moduleId: resolvedModuleIds[i] ?? null,
            created_by: teacherId,
            bankOptions: q.options?.length
              ? {
                  create: q.options.map((opt, idx) => ({
                    option_text: opt.option_text,
                    is_correct: !!opt.is_correct,
                    order_index: opt.order_index ?? idx,
                  })),
                }
              : undefined,
          },
          select: { id: true },
        })
      )
    );

    res.json({ success: true, imported: created.length });
  })
);

// ─── Copy bank rows into a quiz ─────────────────────────────────────────────

router.post(
  "/:courseOfferingId/import/:quizId",
  auth,
  requireQuizManage(),
  validateBody(importToQuizBodySchema),
  asyncHandler(async (req, res) => {
    const cid = parseInt(req.params.courseOfferingId, 10);
    const qid = parseInt(req.params.quizId, 10);
    const { questionIds } = req.body;

    // requireQuizManage already loaded the quiz onto req. We cross-check the
    // URL's courseOfferingId matches — protects against malformed front-end
    // URLs that mix offerings.
    if (req.quiz && req.quiz.courseOfferingId !== cid) {
      return res.status(400).json({ message: "Quiz does not belong to this offering" });
    }

    // Pull every bank row the caller asked for AND scope-filter — anything
    // not on this offering is silently dropped. Better than 403 here because
    // the picker should never have shown the row in the first place;
    // surfacing a hard error would just confuse the teacher.
    const bankQuestions = await prisma.question.findMany({
      where: {
        id: { in: questionIds.map((n) => Number(n)) },
        courseOfferingId: cid,
        is_active: true,
      },
      include: { bankOptions: { orderBy: { order_index: "asc" } } },
    });

    if (bankQuestions.length === 0) {
      return res.json({ success: true, added: 0 });
    }

    // Stamp incoming questions at the end of the quiz's existing order.
    const lastQuestion = await prisma.quizQuestion.findFirst({
      where: { quizId: qid },
      orderBy: { order_index: "desc" },
      select: { order_index: true },
    });
    let nextOrder = (lastQuestion?.order_index ?? -1) + 1;

    // One transaction so a mid-import error rolls back cleanly. Nested
    // create on the options means each copied question is born with its
    // options atomically — no two-phase "options missing for X seconds"
    // window a concurrent reader could trip over.
    const created = await prisma.$transaction(
      bankQuestions.map((bq) => {
        const order_index = nextOrder++;
        return prisma.quizQuestion.create({
          data: {
            quizId: qid,
            question_text: bq.question_text,
            question_type: bq.question_type,
            points: bq.points,
            order_index,
            options: bq.bankOptions.length
              ? {
                  create: bq.bankOptions.map((opt, idx) => ({
                    option_text: opt.option_text,
                    is_correct: opt.is_correct,
                    order_index: opt.order_index ?? idx,
                  })),
                }
              : undefined,
          },
          select: { id: true },
        });
      })
    );

    res.json({ success: true, added: created.length });
  })
);

// ─── AI generation (literal `/generate` segment — MUST come before /:questionId) ─

router.post(
  "/:courseOfferingId/generate",
  auth,
  requireCourseOfferingManage(),
  validateBody(generateQuestionsBodySchema),
  asyncHandler(async (req, res) => {
    // Cheap gate so a missing API key gives a clean error instead of a 500
    // deep in the SDK. The service re-checks too, but bailing here saves the
    // route from constructing the prompt for a request that can't succeed.
    if (!isAiEnabled()) {
      return res.status(503).json({
        message:
          "AI generation is disabled — no AI provider key is configured on the server. Set GROQ_API_KEY (recommended) or GEMINI_API_KEY in the backend .env.",
      });
    }

    const { prompt, sourceMaterial, count, questionTypes, difficulty } =
      req.body;

    // Pull the course title for prompt context — helps the model calibrate
    // to the audience level (intro CS course vs. graduate seminar, etc.).
    // We do this lazily because the RBAC middleware already loaded the
    // offering, but didn't include the related course row.
    let courseTitle = null;
    try {
      const offering = await prisma.courseOffering.findUnique({
        where: { id: parseInt(req.params.courseOfferingId, 10) },
        select: { course: { select: { name: true, code: true } } },
      });
      if (offering?.course) {
        courseTitle = offering.course.code
          ? `${offering.course.code} — ${offering.course.name}`
          : offering.course.name;
      }
    } catch {
      // Course context is a nice-to-have; if the lookup fails we still
      // generate, just without the course title cue.
    }

    try {
      const result = await generateQuizQuestions({
        prompt,
        sourceMaterial: sourceMaterial || null,
        count,
        questionTypes,
        difficulty,
        courseTitle,
      });

      // Mirror the request's question-type filter on the response — if the
      // model occasionally returns a type the teacher didn't ask for, drop
      // it client-side via the picker rather than 4xx-ing the whole batch.
      // We still return everything to the client so the teacher sees what
      // happened.
      res.json({
        questions: result.questions,
        usage: result.usage,
      });
    } catch (e) {
      // Service errors carry a `.status` we honor; SDK errors bubble up as
      // 500 by default. Surface a readable message to the frontend so the
      // teacher knows whether to retry or report.
      const status = e.status || 500;
      res.status(status).json({
        message: e.message || "AI generation failed",
      });
    }
  })
);

// ─── Patch one ──────────────────────────────────────────────────────────────

router.patch(
  "/:courseOfferingId/:questionId",
  auth,
  requireCourseOfferingManage(),
  validateBody(patchBankQuestionBodySchema),
  asyncHandler(async (req, res) => {
    const cid = parseInt(req.params.courseOfferingId, 10);
    const qid = parseInt(req.params.questionId, 10);
    const {
      question_text,
      question_type,
      points,
      topic,
      difficulty,
      moduleId,
      is_active,
      options,
    } = req.body;

    // Load + scope-check the row before we mutate it. A teacher could
    // otherwise edit a bank row from a different offering by crafting the
    // URL — requireCourseOfferingManage only verifies they manage `:cid`,
    // not that `:questionId` belongs to it.
    const existing = await prisma.question.findUnique({
      where: { id: qid },
      select: { courseOfferingId: true },
    });
    if (!existing || existing.courseOfferingId !== cid) {
      return res.status(404).json({ message: "Question not found in this course" });
    }

    let resolvedModuleId;
    if (moduleId !== undefined) {
      try {
        resolvedModuleId = await resolveModuleIdForOffering(moduleId, cid);
      } catch (e) {
        return res.status(e.status || 400).json({ message: e.message });
      }
    }

    // Wrap the row update + (optional) options swap in a single transaction
    // so a concurrent reader never sees "old options deleted, new ones not
    // yet created". Same pattern as the quiz question patch handler.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id: qid },
        data: {
          ...(question_text && { question_text }),
          ...(question_type && { question_type }),
          ...(points !== undefined && { points }),
          ...(topic !== undefined && { topic: topic || null }),
          ...(difficulty !== undefined && { difficulty: difficulty || null }),
          ...(is_active !== undefined && { is_active }),
          ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
        },
      });

      if (options) {
        await tx.questionOptionBank.deleteMany({ where: { questionId: qid } });
        if (options.length > 0) {
          await tx.questionOptionBank.createMany({
            data: options.map((opt, idx) => ({
              questionId: qid,
              option_text: opt.option_text,
              is_correct: !!opt.is_correct,
              order_index: opt.order_index ?? idx,
            })),
          });
        }
      }

      return tx.question.findUnique({
        where: { id: qid },
        include: QUESTION_INCLUDE,
      });
    });

    res.json(updated);
  })
);

// ─── Soft delete ────────────────────────────────────────────────────────────

router.delete(
  "/:courseOfferingId/:questionId",
  auth,
  requireCourseOfferingManage(),
  asyncHandler(async (req, res) => {
    const cid = parseInt(req.params.courseOfferingId, 10);
    const qid = parseInt(req.params.questionId, 10);

    // Same scope-check as patch — block cross-offering tampering.
    const existing = await prisma.question.findUnique({
      where: { id: qid },
      select: { courseOfferingId: true },
    });
    if (!existing || existing.courseOfferingId !== cid) {
      return res.status(404).json({ message: "Question not found in this course" });
    }

    // Soft delete (`is_active = false`) so we can keep history. The list
    // filter already excludes inactive rows, so this hides them from the UI.
    // Hard-deleting would also be fine — bank rows are reference, not
    // mutated by quiz attempts — but the old controller used soft delete
    // and we keep the contract for back-compat.
    await prisma.question.update({
      where: { id: qid },
      data: { is_active: false },
    });

    res.json({ success: true });
  })
);

export default router;
