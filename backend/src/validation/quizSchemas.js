import Joi from "joi";

// ─────────────────────────────────────────────────────────────────────────────
// Joi schemas for every mutating endpoint on /api/quizzes and /api/quiz-taking.
//
// Goals:
//   • Reject malformed bodies at the door — Prisma should never see junk.
//   • Coerce common loose inputs (numeric strings → numbers) so the existing
//     frontend doesn't need to change.
//   • Use `.empty(null)` on optional date fields so the client can clear a
//     schedule by sending `null` (Joi otherwise rejects null on string types).
//
// We follow the house pattern (Joi via validateBody in middleware/validateRequest.js)
// rather than the Zod package — keeps PR diff small.
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_TYPES = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"];
const TIMING_MODES = ["flexible", "fixed"];

// Convenience: dates that can be cleared by passing null.
const optionalDate = Joi.alternatives().try(
  Joi.date().iso(),
  Joi.valid(null)
);

const optionInputSchema = Joi.object({
  option_text: Joi.string().trim().min(1).max(2000).required(),
  is_correct: Joi.boolean().default(false),
  // The controller re-stamps order_index from array position anyway,
  // but accepting it keeps the API symmetric with the GET shape.
  order_index: Joi.number().integer().min(0).max(1000).optional(),
});

// Inline question shape accepted when creating a quiz AND its questions in a
// single request (the "Generate whole quiz with AI" flow). Same option-shape
// rules as the standalone create-question endpoint; `order_index` is stamped
// server-side from array position, so it isn't accepted here.
const nestedQuizQuestionSchema = Joi.object({
  question_text: Joi.string().trim().min(1).max(5000).required(),
  question_type: Joi.string().valid(...QUESTION_TYPES).default("MCQ"),
  points: Joi.number().min(0.01).max(100).default(1),
  correct_answer: Joi.string().allow("", null).max(2000).optional(),
  explanation: Joi.string().trim().allow("", null).max(5000).optional(),
  options: Joi.array().items(optionInputSchema).max(50).optional(),
}).custom((value, helpers) => {
  if (value.question_type === "SHORT_ANSWER") return value;
  const opts = value.options ?? [];
  if (opts.length < 2) {
    return helpers.error("any.custom", { message: "At least 2 options required" });
  }
  if (!opts.some((o) => o.is_correct)) {
    return helpers.error("any.custom", { message: "Mark at least one option as correct" });
  }
  if (value.question_type === "TRUE_FALSE" && opts.filter((o) => o.is_correct).length > 1) {
    return helpers.error("any.custom", { message: "True/False allows only one correct option" });
  }
  return value;
}, "options shape");

// ─── Quiz CRUD ───────────────────────────────────────────────────────────────

export const createQuizBodySchema = Joi.object({
  title: Joi.string().trim().min(1).max(300).required(),
  description: Joi.string().trim().allow("", null).max(5000).optional(),
  duration_minutes: Joi.number().integer().min(1).max(480).default(30),
  is_draft: Joi.boolean().default(false),
  open_at: optionalDate,
  close_at: optionalDate,
  shuffle_questions: Joi.boolean().default(false),
  shuffle_answers: Joi.boolean().default(false),
  max_attempts: Joi.number().integer().min(1).max(100).default(1),
  passing_score: Joi.number().min(0).max(100).default(50),
  timing_mode: Joi.string().valid(...TIMING_MODES).default("flexible"),
  scheduled_duration: Joi.number().integer().min(1).max(480).allow(null).optional(),
  // Optional chapter / module bucket. The route handler verifies the module
  // belongs to the same course offering before writing.
  moduleId: Joi.number().integer().positive().allow(null).optional(),
  // Cologne / Bristol confidence-based scoring. Off by default; teachers
  // opt in per quiz. See scoreAnswer() in quizAttempt.service.js.
  confidence_scoring: Joi.boolean().default(false),
  // Optional inline questions — create the quiz AND its questions atomically.
  // Used by the AI "generate a whole quiz" flow so the teacher lands in the
  // builder with a populated draft. Capped at 100 to bound the create
  // transaction; omit for a normal empty-quiz create.
  questions: Joi.array().items(nestedQuizQuestionSchema).max(100).optional(),
})
  // open_at < close_at when both are set. Joi gives a readable error.
  .custom((value, helpers) => {
    if (value.open_at && value.close_at && new Date(value.open_at) >= new Date(value.close_at)) {
      return helpers.error("any.custom", { message: "open_at must be before close_at" });
    }
    return value;
  }, "open/close window order");

export const patchQuizBodySchema = Joi.object({
  title: Joi.string().trim().min(1).max(300).optional(),
  description: Joi.string().trim().allow("", null).max(5000).optional(),
  duration_minutes: Joi.number().integer().min(1).max(480).optional(),
  is_draft: Joi.boolean().optional(),
  open_at: optionalDate,
  close_at: optionalDate,
  shuffle_questions: Joi.boolean().optional(),
  shuffle_answers: Joi.boolean().optional(),
  max_attempts: Joi.number().integer().min(1).max(100).optional(),
  passing_score: Joi.number().min(0).max(100).optional(),
  timing_mode: Joi.string().valid(...TIMING_MODES).optional(),
  scheduled_duration: Joi.number().integer().min(1).max(480).allow(null).optional(),
  moduleId: Joi.number().integer().positive().allow(null).optional(),
  confidence_scoring: Joi.boolean().optional(),
}).min(1); // require at least one field

// ─── Questions ───────────────────────────────────────────────────────────────

export const createQuestionBodySchema = Joi.object({
  question_text: Joi.string().trim().min(1).max(5000).required(),
  question_type: Joi.string().valid(...QUESTION_TYPES).default("MCQ"),
  points: Joi.number().min(0.01).max(100).default(1),
  correct_answer: Joi.string().allow("", null).max(2000).optional(),
  // Shown to the student on the review screen after submit. Plain text only
  // for now — markdown / KaTeX comes in Phase P2 of the audit.
  explanation: Joi.string().trim().allow("", null).max(5000).optional(),
  options: Joi.array().items(optionInputSchema).max(50).optional(),
})
  // MCQ / True-False must have at least one correct option among >=2 options.
  // Short-answer can omit options entirely.
  .custom((value, helpers) => {
    if (value.question_type === "SHORT_ANSWER") return value;
    const opts = value.options ?? [];
    if (opts.length < 2) {
      return helpers.error("any.custom", { message: "At least 2 options required" });
    }
    if (!opts.some((o) => o.is_correct)) {
      return helpers.error("any.custom", { message: "Mark at least one option as correct" });
    }
    if (value.question_type === "TRUE_FALSE" && opts.filter((o) => o.is_correct).length > 1) {
      return helpers.error("any.custom", { message: "True/False allows only one correct option" });
    }
    return value;
  }, "options shape");

export const patchQuestionBodySchema = Joi.object({
  question_text: Joi.string().trim().min(1).max(5000).optional(),
  question_type: Joi.string().valid(...QUESTION_TYPES).optional(),
  points: Joi.number().min(0.01).max(100).optional(),
  correct_answer: Joi.string().allow("", null).max(2000).optional(),
  explanation: Joi.string().trim().allow("", null).max(5000).optional(),
  options: Joi.array().items(optionInputSchema).max(50).optional(),
}).min(1);

// ─── Submit / Grade ──────────────────────────────────────────────────────────

const answerInputSchema = Joi.object({
  id: Joi.number().integer().positive().optional(), // ignored by server, accepted for back-compat
  questionId: Joi.number().integer().positive().required(),
  selected_option_id: Joi.number().integer().positive().allow(null).optional(),
  text_answer: Joi.string().allow("", null).max(20000).optional(),
  // Confidence is optional. Quizzes without confidence_scoring ignore it.
  // We accept lowercase too — the service normalises via toUpperCase().
  confidence: Joi.string().valid("LOW", "MED", "HIGH", "low", "med", "high").allow(null).optional(),
});

export const submitAttemptBodySchema = Joi.object({
  attemptId: Joi.number().integer().positive().required(),
  answers: Joi.array().items(answerInputSchema).max(1000).default([]),
  violations_count: Joi.number().integer().min(0).max(100).default(0),
});

/// Used by the autosave endpoint. Same answer shape as submit, but
/// `attemptId` comes from the URL and there's no violation tracking yet
/// (those land at submit time). `answers` may be empty — the client may
/// fire an autosave before the student has touched anything, especially on
/// resume to re-confirm the latest state.
export const saveAttemptAnswersBodySchema = Joi.object({
  answers: Joi.array().items(answerInputSchema).max(1000).default([]),
});

const gradedAnswerSchema = Joi.object({
  answerId: Joi.number().integer().positive().required(),
  points_earned: Joi.number().min(0).max(100).required(),
  is_correct: Joi.boolean().optional(),
});

export const gradeAttemptBodySchema = Joi.object({
  answers: Joi.array().items(gradedAnswerSchema).min(1).max(1000).required(),
});

/// Body for the bulk question-reorder endpoint. `items` is the new order;
/// `order_index` is what the row should be updated to. Same shape as the
/// resource reorder route so the frontend pattern is uniform.
export const reorderQuestionsBodySchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().positive().required(),
        order_index: Joi.number().integer().min(0).max(10000).required(),
      })
    )
    .min(1)
    .max(500)
    .required(),
});

/// Body for the quiz CSV import endpoint. The frontend parses + validates
/// the CSV client-side (using the shared `parseQuestionCsv` util), then
/// POSTs a clean JSON array. We still re-validate here at the schema layer
/// so a hand-crafted curl can't bypass the client checks. Caps at 500 rows
/// to bound transaction size.
const quizCsvOptionSchema = Joi.object({
  option_text: Joi.string().trim().min(1).max(2000).required(),
  is_correct: Joi.boolean().default(false),
  order_index: Joi.number().integer().min(0).max(50).optional(),
});

const quizCsvQuestionSchema = Joi.object({
  question_text: Joi.string().trim().min(1).max(5000).required(),
  question_type: Joi.string().valid(...QUESTION_TYPES).default("MCQ"),
  points: Joi.number().min(0.01).max(100).default(1),
  explanation: Joi.string().trim().allow("", null).max(5000).optional(),
  options: Joi.array().items(quizCsvOptionSchema).max(50).optional(),
}).custom((value, helpers) => {
  if (value.question_type === "SHORT_ANSWER") return value;
  const opts = value.options ?? [];
  if (opts.length < 2) {
    return helpers.error("any.custom", { message: "At least 2 options required" });
  }
  if (!opts.some((o) => o.is_correct)) {
    return helpers.error("any.custom", { message: "Mark at least one option as correct" });
  }
  if (value.question_type === "TRUE_FALSE" && opts.filter((o) => o.is_correct).length > 1) {
    return helpers.error("any.custom", { message: "True/False allows only one correct option" });
  }
  return value;
}, "options shape");

export const importQuizCsvBodySchema = Joi.object({
  questions: Joi.array().items(quizCsvQuestionSchema).max(500).default([]),
});
