import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { finalizeAttempt } from "../../services/quizAttempt.service.js";
import { emitSubmitted as emitMonitorSubmitted } from "../../socket/quizLiveMonitor.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireQuizManage,
  requireQuizQuestionManage,
  requireStudentQuizAccess,
} from "../../middleware/courseOfferingRbac.js";
import {
  createQuizBodySchema,
  patchQuizBodySchema,
  createQuestionBodySchema,
  patchQuestionBodySchema,
  submitAttemptBodySchema,
  reorderQuestionsBodySchema,
  importQuizCsvBodySchema,
} from "../../validation/quizSchemas.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Quizzes — teacher CRUD + student submit.
//
// Route order note: Express matches in declaration order. Literal-segment
// routes (`/reorder`, `/questions/:id`, `/:id/attempts`, `/:id/submit`,
// `/:id/questions`) live BELOW `/:courseOfferingId` and `/:quizId` only when
// they have two path segments, so they don't collide. There is intentionally
// NO standalone `GET /:quizId` route — the path shape would conflict with
// `GET /:courseOfferingId` above. The single-quiz payload is already returned
// by the offering list, so a dedicated lookup is unnecessary.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:courseOfferingId', auth, requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const cid = parseInt(req.params.courseOfferingId, 10);

  const quizzes = await prisma.quiz.findMany({
    where: { courseOfferingId: cid },
    include: {
      questions: {
        include: { options: { orderBy: { order_index: 'asc' } } },
        orderBy: { order_index: 'asc' }
      },
      // Lightweight module summary for the grouped list view — title + the
      // publish flag are all the UI needs to render the chapter accordion.
      module: { select: { id: true, title: true, position: true, publishedAt: true } },
      _count: { select: { attempts: true } }
    },
    orderBy: { created_at: 'desc' },
  });

  // "Needs grading" surfaces the count of SUBMITTED attempts that still
  // contain at least one short-answer answer the teacher hasn't scored
  // (is_correct IS NULL). One grouped query for the whole offering — much
  // cheaper than fanning out per-quiz, and reused by the list card to show
  // a "3 need grading" badge so the teacher sees pending work at a glance.
  const quizIds = quizzes.map((q) => q.id);
  const pendingGroups = quizIds.length
    ? await prisma.quizAttempt.findMany({
        where: {
          quizId: { in: quizIds },
          submitted_at: { not: null },
          answers: {
            some: {
              is_correct: null,
              question: { question_type: 'SHORT_ANSWER' },
            },
          },
        },
        select: { quizId: true },
      })
    : [];
  const pendingByQuiz = new Map();
  for (const a of pendingGroups) {
    pendingByQuiz.set(a.quizId, (pendingByQuiz.get(a.quizId) ?? 0) + 1);
  }

  res.json(
    quizzes.map((q) => ({
      ...q,
      pendingGradingCount: pendingByQuiz.get(q.id) ?? 0,
    }))
  );
}));

/// Verify the moduleId in the body (if any) belongs to `courseOfferingId`.
/// Returns the numeric module id, `null` (Ungrouped), or throws a 400-shaped
/// error the route handler converts to a response. Centralising this keeps
/// create / patch consistent and dodges cross-offering link attacks.
async function resolveModuleIdForOffering(rawModuleId, courseOfferingId) {
  if (rawModuleId === undefined) return undefined; // not touching the field
  if (rawModuleId === null) return null;
  const mod = await prisma.courseModule.findUnique({
    where: { id: Number(rawModuleId) },
    select: { id: true, courseOfferingId: true },
  });
  if (!mod || mod.courseOfferingId !== courseOfferingId) {
    const err = new Error('Module does not belong to this course');
    err.status = 400;
    throw err;
  }
  return mod.id;
}

router.post('/:courseOfferingId', auth, requireCourseOfferingManage(), validateBody(createQuizBodySchema), asyncHandler(async (req, res) => {
  const cid = parseInt(req.params.courseOfferingId, 10);
  const {
    title, description, duration_minutes, is_draft, open_at, close_at,
    shuffle_questions, shuffle_answers, max_attempts, passing_score,
    timing_mode, scheduled_duration, moduleId, questions
  } = req.body;

  // Resolve once, surfacing cross-offering attempts as a clean 400.
  let resolvedModuleId;
  try {
    resolvedModuleId = await resolveModuleIdForOffering(moduleId, cid);
  } catch (e) {
    return res.status(e.status || 400).json({ message: e.message });
  }

  // Optional inline questions (AI "generate a whole quiz" flow). Nest them
  // under the quiz so the create is atomic — order_index follows the array
  // position the teacher curated in the preview. Short-answer rows carry no
  // options. The schema already validated each row's option shape.
  const nestedQuestions =
    Array.isArray(questions) && questions.length > 0
      ? {
          create: questions.map((q, i) => ({
            question_text: q.question_text,
            question_type: q.question_type || 'MCQ',
            points: q.points ?? 1,
            correct_answer: q.correct_answer ?? null,
            explanation: q.explanation ?? null,
            order_index: i,
            options:
              q.question_type !== 'SHORT_ANSWER' && q.options?.length
                ? {
                    create: q.options.map((o, idx) => ({
                      option_text: o.option_text,
                      is_correct: !!o.is_correct,
                      order_index: o.order_index ?? idx,
                    })),
                  }
                : undefined,
          })),
        }
      : undefined;

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description,
      duration_minutes: duration_minutes || 30,
      courseOfferingId: cid,
      is_draft: is_draft || false,
      open_at: open_at ? new Date(open_at) : null,
      close_at: close_at ? new Date(close_at) : null,
      shuffle_questions: shuffle_questions || false,
      shuffle_answers: shuffle_answers || false,
      max_attempts: max_attempts || 1,
      passing_score: passing_score || 50,
      timing_mode: timing_mode || 'flexible',
      scheduled_duration: scheduled_duration || null,
      ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
      ...(nestedQuestions && { questions: nestedQuestions }),
    },
    include: {
      questions: { include: { options: true } },
      module: { select: { id: true, title: true, position: true, publishedAt: true } },
      _count: { select: { attempts: true } }
    },
  });

  res.json(quiz);
}));

router.patch('/:quizId', auth, requireQuizManage(), validateBody(patchQuizBodySchema), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.quizId, 10);
  const {
    title, description, duration_minutes, is_draft, open_at, close_at,
    shuffle_questions, shuffle_answers, max_attempts, passing_score,
    timing_mode, scheduled_duration, moduleId
  } = req.body;

  // For module changes, validate the new module sits inside the same offering
  // before we issue the update. We look the offering up from the quiz itself —
  // the RBAC middleware already confirmed the caller can manage this quiz.
  let resolvedModuleId; // undefined = leave alone
  if (moduleId !== undefined) {
    const existing = await prisma.quiz.findUnique({
      where: { id: qid },
      select: { courseOfferingId: true },
    });
    if (!existing) return res.status(404).json({ message: 'Quiz not found' });
    try {
      resolvedModuleId = await resolveModuleIdForOffering(moduleId, existing.courseOfferingId);
    } catch (e) {
      return res.status(e.status || 400).json({ message: e.message });
    }
  }

  const quiz = await prisma.quiz.update({
    where: { id: qid },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(duration_minutes && { duration_minutes }),
      ...(is_draft !== undefined && { is_draft }),
      ...(open_at !== undefined && { open_at: open_at ? new Date(open_at) : null }),
      ...(close_at !== undefined && { close_at: close_at ? new Date(close_at) : null }),
      ...(shuffle_questions !== undefined && { shuffle_questions }),
      ...(shuffle_answers !== undefined && { shuffle_answers }),
      ...(max_attempts && { max_attempts }),
      ...(passing_score !== undefined && { passing_score }),
      ...(timing_mode && { timing_mode }),
      ...(scheduled_duration !== undefined && { scheduled_duration }),
      ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
    },
    include: {
      questions: { include: { options: true } },
      module: { select: { id: true, title: true, position: true, publishedAt: true } },
      _count: { select: { attempts: true } }
    },
  });

  res.json(quiz);
}));

/// Delete is now a single statement — the DB's cascade rules wipe attempts,
/// answers, questions, and options atomically (see the cascade migration).
router.delete('/:quizId', auth, requireQuizManage(), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.quizId, 10);
  await prisma.quiz.delete({ where: { id: qid } });
  res.json({ success: true });
}));

/// Duplicate a quiz including all of its questions and options. The new quiz
/// lands as a DRAFT, prefixed with "Copy of ", and is filed in the same
/// chapter (moduleId) as the source so the teacher finds it next to the
/// original. Attempts / autosaved answers from the source are NOT copied —
/// the duplicate starts with a clean slate so students don't inherit a peer's
/// answers if it gets published. Single transaction so a mid-flight failure
/// can't leave a half-cloned quiz behind.
router.post('/:quizId/duplicate', auth, requireQuizManage(), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.quizId, 10);

  const source = await prisma.quiz.findUnique({
    where: { id: qid },
    include: {
      questions: {
        include: { options: { orderBy: { order_index: 'asc' } } },
        orderBy: { order_index: 'asc' },
      },
    },
  });
  if (!source) return res.status(404).json({ message: 'Quiz not found' });

  // Clone in one transaction so any DB error rolls back partial writes.
  const created = await prisma.$transaction(async (tx) => {
    const newQuiz = await tx.quiz.create({
      data: {
        title: `Copy of ${source.title}`,
        description: source.description,
        duration_minutes: source.duration_minutes,
        courseOfferingId: source.courseOfferingId,
        is_draft: true, // always start drafts — protects against accidental publish
        open_at: source.open_at,
        close_at: source.close_at,
        shuffle_questions: source.shuffle_questions,
        shuffle_answers: source.shuffle_answers,
        max_attempts: source.max_attempts,
        passing_score: source.passing_score,
        timing_mode: source.timing_mode,
        scheduled_duration: source.scheduled_duration,
        moduleId: source.moduleId,
      },
    });

    for (const q of source.questions) {
      await tx.quizQuestion.create({
        data: {
          quizId: newQuiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          order_index: q.order_index,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          options: q.options.length
            ? {
                create: q.options.map((o) => ({
                  option_text: o.option_text,
                  is_correct: o.is_correct,
                  order_index: o.order_index,
                })),
              }
            : undefined,
        },
      });
    }

    return tx.quiz.findUnique({
      where: { id: newQuiz.id },
      include: {
        questions: { include: { options: true }, orderBy: { order_index: 'asc' } },
        module: { select: { id: true, title: true, position: true, publishedAt: true } },
        _count: { select: { attempts: true } },
      },
    });
  });

  res.status(201).json(created);
}));

// ─── CSV import / export ────────────────────────────────────────────────────
//
// Round-trip surface for a single quiz's questions:
//   - GET /:quizId/export — returns { filename, csv } as JSON. Doing the
//     serialization server-side means the export is identical regardless of
//     the client (browser, curl, future mobile app) and skips a round-trip
//     to fetch all options.
//   - POST /:quizId/import — accepts a CSV body, parses + validates rows,
//     appends them to the quiz as fresh QuizQuestion rows. We DON'T replace
//     the existing questions — that would silently drop work; instead we
//     append at the end so teachers can mix imported + hand-authored
//     questions in one pass.
//
// Both endpoints are declared after the bare PATCH/DELETE so Express's
// in-order matcher doesn't swallow the `/export` / `/import` literal
// segments. Two segments after `:quizId` is unambiguous.

/// Format: matches the shared parser in
/// `frontend/src/features/course-details/components/_shared/question-csv.ts`.
/// Keep the column order + names in sync — the bank manager and this quiz
/// round-trip share the same input shape, the only difference being that
/// quiz exports also include the `explanation` column.
function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (s === "") return "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildQuizCsv(questions) {
  // Find the max option count any question uses so the header carries
  // enough columns. Capped at 6 to match the parser's walk. Floor at 2 so
  // even an all-short-answer quiz still gets the canonical option columns
  // (makes the file template-shaped for the teacher to edit in Excel).
  const maxOptions = Math.min(
    6,
    Math.max(2, ...questions.map((q) => q.options?.length ?? 0))
  );
  const headerCells = [
    "question_text",
    "type",
    "points",
    "topic",
    "difficulty",
    "explanation",
  ];
  for (let n = 1; n <= maxOptions; n++) {
    headerCells.push(`option_${n}`);
    headerCells.push(`option_${n}_correct`);
  }

  const lines = [headerCells.join(",")];
  for (const q of questions) {
    const cells = [
      q.question_text,
      q.question_type,
      String(q.points),
      // Quiz questions don't carry topic/difficulty (those live on the bank
      // model). We emit blank cells so the column layout stays canonical;
      // teachers who want to add tags can fill them in and re-import as
      // bank questions later.
      "",
      "",
      q.explanation ?? "",
    ];
    const opts = (q.options ?? []).slice(0, maxOptions);
    for (let n = 0; n < maxOptions; n++) {
      const o = opts[n];
      cells.push(o ? o.option_text : "");
      cells.push(o ? (o.is_correct ? "true" : "false") : "");
    }
    lines.push(cells.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

router.get(
  "/:quizId/export",
  auth,
  requireQuizManage(),
  asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    const quiz = await prisma.quiz.findUnique({
      where: { id: qid },
      include: {
        questions: {
          include: { options: { orderBy: { order_index: "asc" } } },
          orderBy: { order_index: "asc" },
        },
      },
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const csv = buildQuizCsv(quiz.questions);
    // Slug the title so the download filename is shell-safe across OSes —
    // Windows in particular gets cranky about ?, /, :, etc. We also drop
    // accents because non-ASCII filenames trigger Content-Disposition
    // encoding negotiation we don't need.
    const slug = (quiz.title || `quiz-${quiz.id}`)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || `quiz-${quiz.id}`;

    res.json({
      filename: `${slug}.csv`,
      csv,
      questionCount: quiz.questions.length,
    });
  })
);

router.post(
  "/:quizId/import",
  auth,
  requireQuizManage(),
  validateBody(importQuizCsvBodySchema),
  asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    const { questions } = req.body;

    if (questions.length === 0) {
      return res.json({ success: true, imported: 0 });
    }

    // Find the current max order_index so we APPEND rather than overwrite.
    // Replacing the existing list would silently destroy teacher work — the
    // import is purely additive. If the teacher wants to start over, they
    // can delete questions first via the builder.
    const last = await prisma.quizQuestion.findFirst({
      where: { quizId: qid },
      orderBy: { order_index: "desc" },
      select: { order_index: true },
    });
    let nextOrder = (last?.order_index ?? -1) + 1;

    // One transaction so a mid-import error rolls back cleanly. Nested
    // option create keeps each question + its options atomically attached
    // (no half-populated row visible to concurrent readers).
    const created = await prisma.$transaction(
      questions.map((q) => {
        const order_index = nextOrder++;
        return prisma.quizQuestion.create({
          data: {
            quizId: qid,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points ?? 1,
            // Quiz questions DO carry explanation (unlike bank questions),
            // so the round-trip is information-preserving for this field.
            explanation: q.explanation || null,
            order_index,
            options:
              q.question_type === "SHORT_ANSWER" || !q.options?.length
                ? undefined
                : {
                    create: q.options.map((opt, idx) => ({
                      option_text: opt.option_text,
                      is_correct: !!opt.is_correct,
                      order_index: opt.order_index ?? idx,
                    })),
                  },
          },
          select: { id: true },
        });
      })
    );

    res.json({ success: true, imported: created.length });
  })
);

// ─── Questions ───────────────────────────────────────────────────────────────

/// Bulk reorder questions. Body: `{ items: [{id, order_index}] }`. All
/// updates run in a single transaction so the list never appears
/// half-shuffled to a concurrent reader. Same pattern as the resources
/// reorder endpoint. Declared BEFORE `POST /:quizId/questions` so the path
/// shape `:quizId/questions/reorder` matches this route exclusively.
router.post(
  '/:quizId/questions/reorder',
  auth,
  requireQuizManage(),
  validateBody(reorderQuestionsBodySchema),
  asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    const items = req.body.items;
    // Guard: only allow reordering questions belonging to THIS quiz. A
    // malicious teacher could otherwise reach in via a hand-crafted body and
    // shuffle questions on a different quiz.
    const ownIds = new Set(
      (await prisma.quizQuestion.findMany({
        where: { quizId: qid },
        select: { id: true },
      })).map((q) => q.id)
    );
    const safeItems = items.filter((it) => ownIds.has(it.id));

    await prisma.$transaction(
      safeItems.map((it) =>
        prisma.quizQuestion.update({
          where: { id: it.id },
          data: { order_index: it.order_index },
        })
      )
    );
    res.json({ updated: safeItems.length });
  })
);

router.post('/:quizId/questions', auth, requireQuizManage(), validateBody(createQuestionBodySchema), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.quizId, 10);
  const { question_text, question_type, points, correct_answer, explanation, options } = req.body;

  // `?? -1` not `|| 0`: the existing `|| 0` collapses a legitimate
  // `order_index === 0` to 0, so the second question would also get 1 and
  // collide. Treating "no previous question" as -1 gives a clean 0, 1, 2…
  const lastQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId: qid },
    orderBy: { order_index: 'desc' }
  });
  const order_index = (lastQuestion?.order_index ?? -1) + 1;

  // Create question + its options in one nested create so the row is never
  // left partially populated if the request fails mid-way.
  const question = await prisma.quizQuestion.create({
    data: {
      quizId: qid,
      question_text,
      question_type: question_type || 'MCQ',
      points: points || 1,
      correct_answer,
      explanation: explanation ?? null,
      order_index,
      options: options && options.length > 0
        ? {
            create: options.map((opt, idx) => ({
              option_text: opt.option_text,
              is_correct: opt.is_correct || false,
              order_index: opt.order_index ?? idx,
            }))
          }
        : undefined,
    },
    include: { options: { orderBy: { order_index: 'asc' } } }
  });

  res.json(question);
}));

router.patch('/questions/:questionId', auth, requireQuizQuestionManage(), validateBody(patchQuestionBodySchema), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.questionId, 10);
  const { question_text, question_type, points, correct_answer, explanation, options } = req.body;

  // Wrap the question update + option swap in a transaction so a concurrent
  // reader never sees "options deleted, new ones not yet created".
  const updated = await prisma.$transaction(async (tx) => {
    await tx.quizQuestion.update({
      where: { id: qid },
      data: {
        ...(question_text && { question_text }),
        ...(question_type && { question_type }),
        ...(points && { points }),
        ...(correct_answer !== undefined && { correct_answer }),
        ...(explanation !== undefined && { explanation }),
      },
    });

    if (options) {
      await tx.quizOption.deleteMany({ where: { questionId: qid } });
      if (options.length > 0) {
        await tx.quizOption.createMany({
          data: options.map((opt, idx) => ({
            questionId: qid,
            option_text: opt.option_text,
            is_correct: opt.is_correct || false,
            order_index: opt.order_index ?? idx,
          }))
        });
      }
    }

    return tx.quizQuestion.findUnique({
      where: { id: qid },
      include: { options: { orderBy: { order_index: 'asc' } } }
    });
  });

  res.json(updated);
}));

/// Cascade rule drops the options + any answers attached to this question
/// when the question is deleted, so a single delete is all we need.
router.delete('/questions/:questionId', auth, requireQuizQuestionManage(), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.questionId, 10);
  await prisma.quizQuestion.delete({ where: { id: qid } });
  res.json({ success: true });
}));

// ─── Attempts (teacher view) ─────────────────────────────────────────────────

router.get('/:quizId/attempts', auth, requireQuizManage(), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.quizId, 10);

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: qid },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } },
      answers: { include: { question: true } }
    },
    orderBy: { started_at: 'desc' },
  });

  res.json(attempts);
}));

/// Per-question analytics: how often each question was answered correctly,
/// which incorrect option students gravitated to, and overall difficulty.
/// Aggregates over every SUBMITTED attempt — in-progress and abandoned rows
/// are excluded so the numbers reflect real exam behaviour.
///
/// Shape:
///   { totalSubmissions, avgScore, questions: [{
///       id, question_text, question_type, points, order_index,
///       totalAnswered, correctCount, correctRate (0-100), pending (SA only),
///       optionStats?: [{ optionId, option_text, is_correct, pickedCount, pickedPct }]
///   }] }
router.get('/:quizId/analytics', auth, requireQuizManage(), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.quizId, 10);

  const quiz = await prisma.quiz.findUnique({
    where: { id: qid },
    include: {
      questions: {
        include: { options: { orderBy: { order_index: 'asc' } } },
        orderBy: { order_index: 'asc' },
      },
    },
  });
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  const submitted = await prisma.quizAttempt.findMany({
    where: { quizId: qid, submitted_at: { not: null } },
    select: {
      id: true,
      score: true,
      answers: {
        select: {
          questionId: true,
          selected_option_id: true,
          is_correct: true,
        },
      },
    },
  });

  const totalSubmissions = submitted.length;
  const scoredAttempts = submitted.filter((a) => typeof a.score === 'number');
  const avgScore = scoredAttempts.length
    ? Math.round(
        (scoredAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / scoredAttempts.length) * 10
      ) / 10
    : null;

  // Bucket answers by question for O(N) aggregation. We track pending
  // separately so short-answer rows the teacher hasn't graded yet don't
  // skew the correct-rate downward.
  const byQuestion = new Map();
  for (const a of submitted) {
    for (const ans of a.answers) {
      let bucket = byQuestion.get(ans.questionId);
      if (!bucket) {
        bucket = {
          totalAnswered: 0,
          correctCount: 0,
          pending: 0,
          // Map<optionId, pickedCount>
          optionPicks: new Map(),
        };
        byQuestion.set(ans.questionId, bucket);
      }
      bucket.totalAnswered++;
      if (ans.is_correct === true) bucket.correctCount++;
      else if (ans.is_correct === null) bucket.pending++;
      if (ans.selected_option_id != null) {
        bucket.optionPicks.set(
          ans.selected_option_id,
          (bucket.optionPicks.get(ans.selected_option_id) ?? 0) + 1
        );
      }
    }
  }

  const questions = quiz.questions.map((q) => {
    const b = byQuestion.get(q.id) ?? {
      totalAnswered: 0,
      correctCount: 0,
      pending: 0,
      optionPicks: new Map(),
    };
    // correctRate excludes pending rows from the denominator — counting an
    // ungraded SA as "wrong" would mislead the teacher into thinking the
    // question was too hard when really it's just unscored.
    const graded = b.totalAnswered - b.pending;
    const correctRate = graded > 0 ? Math.round((b.correctCount / graded) * 100) : null;

    const optionStats = q.options.length
      ? q.options.map((o) => {
          const picked = b.optionPicks.get(o.id) ?? 0;
          return {
            optionId: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
            pickedCount: picked,
            pickedPct: b.totalAnswered > 0 ? Math.round((picked / b.totalAnswered) * 100) : 0,
          };
        })
      : undefined;

    return {
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      order_index: q.order_index,
      totalAnswered: b.totalAnswered,
      correctCount: b.correctCount,
      correctRate,
      pending: b.pending,
      optionStats,
    };
  });

  res.json({ totalSubmissions, avgScore, questions });
}));

// ─── Submit attempt (student) ────────────────────────────────────────────────

router.post('/:quizId/submit', auth, requireStudentQuizAccess(), validateBody(submitAttemptBodySchema), asyncHandler(async (req, res) => {
  const qid = parseInt(req.params.quizId, 10);
  const { attemptId, answers, violations_count } = req.body;
  const studentId = req.user.id ?? req.user.sub;

  // Verify ownership before delegating to the shared finalizer. Without this
  // check a student could submit anyone else's attempt by guessing the id.
  const attemptRow = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attemptRow) return res.status(404).json({ message: 'Attempt not found' });
  if (attemptRow.studentId !== studentId || attemptRow.quizId !== qid) {
    return res.status(403).json({ message: 'Attempt does not belong to caller' });
  }

  // If the deadline already passed, the auto-submit cron may have finalized
  // this attempt seconds ago. `finalizeAttempt` is idempotent — it returns
  // the existing finalized row instead of double-scoring.
  const updatedAttempt = await finalizeAttempt({
    attemptId,
    answers,
    violationsCount: violations_count,
  });

  // Live-monitor: flip the teacher's tile to "submitted" with the score.
  // closure_reason is either null (manual submit) or whatever finalize put
  // on the row (e.g. 'time_expired' if cron beat the student to it).
  try {
    emitMonitorSubmitted({
      quizId: qid,
      attempt: updatedAttempt,
      closureReason: updatedAttempt?.closure_reason ?? null,
    });
  } catch (e) {
    console.warn("[quiz-monitor] emit on submit failed:", e.message);
  }

  res.json(updatedAttempt);
}));

export default router;
