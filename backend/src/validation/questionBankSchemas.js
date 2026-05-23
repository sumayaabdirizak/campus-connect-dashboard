import Joi from "joi";

// ─────────────────────────────────────────────────────────────────────────────
// Joi schemas for the offering-scoped question bank
// (POST/PATCH /api/question-bank/:courseOfferingId/...).
//
// The bank lives alongside the quizzes tab. New bank rows are scoped to a
// CourseOffering and optionally pinned to a CourseModule (chapter). Older,
// flat-list rows survive in the DB but are invisible to these endpoints — the
// controller filters `courseOfferingId: cid` so they can't leak across
// offerings. The shapes below mirror the quiz question schemas so the
// "Import from Bank" pipeline can reuse the same option_text / is_correct
// validation.
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_TYPES = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const optionInputSchema = Joi.object({
  option_text: Joi.string().trim().min(1).max(2000).required(),
  is_correct: Joi.boolean().default(false),
  order_index: Joi.number().integer().min(0).max(1000).optional(),
});

/// Cross-field rule used by both create and patch — if `question_type` is
/// supplied (or already MCQ / TRUE_FALSE), the options array must be shaped
/// correctly. We allow patch to skip this when the caller is only editing
/// metadata (topic, difficulty, text) without touching options.
function validateOptionsShape(value, helpers) {
  // SHORT_ANSWER never needs options.
  if (value.question_type === "SHORT_ANSWER") return value;
  // If options weren't touched in a patch, skip the check — preserves the
  // existing row's option shape. Only enforce when the caller actually
  // submits an `options` field.
  if (value.options === undefined) return value;
  if (value.options.length < 2) {
    return helpers.error("any.custom", { message: "At least 2 options required" });
  }
  if (!value.options.some((o) => o.is_correct)) {
    return helpers.error("any.custom", { message: "Mark at least one option as correct" });
  }
  if (
    value.question_type === "TRUE_FALSE" &&
    value.options.filter((o) => o.is_correct).length > 1
  ) {
    return helpers.error("any.custom", { message: "True/False allows only one correct option" });
  }
  return value;
}

export const createBankQuestionBodySchema = Joi.object({
  question_text: Joi.string().trim().min(1).max(5000).required(),
  question_type: Joi.string().valid(...QUESTION_TYPES).default("MCQ"),
  points: Joi.number().min(0.01).max(100).default(1),
  topic: Joi.string().trim().allow("", null).max(200).optional(),
  difficulty: Joi.string().valid(...DIFFICULTIES).allow(null).optional(),
  // Optional chapter pin — controller checks the module belongs to this
  // offering before writing.
  moduleId: Joi.number().integer().positive().allow(null).optional(),
  options: Joi.array().items(optionInputSchema).max(50).optional(),
}).custom(validateOptionsShape, "options shape");

export const patchBankQuestionBodySchema = Joi.object({
  question_text: Joi.string().trim().min(1).max(5000).optional(),
  question_type: Joi.string().valid(...QUESTION_TYPES).optional(),
  points: Joi.number().min(0.01).max(100).optional(),
  topic: Joi.string().trim().allow("", null).max(200).optional(),
  difficulty: Joi.string().valid(...DIFFICULTIES).allow(null).optional(),
  moduleId: Joi.number().integer().positive().allow(null).optional(),
  is_active: Joi.boolean().optional(),
  options: Joi.array().items(optionInputSchema).max(50).optional(),
})
  .min(1)
  .custom(validateOptionsShape, "options shape");

/// CSV-style bulk insert. The frontend parses the CSV client-side and POSTs
/// a clean JSON array — keeps the API symmetric with one-at-a-time create.
/// Empty / malformed rows are dropped client-side; we still cap to 500 here
/// so a runaway file can't DoS the server.
export const importBankQuestionsBodySchema = Joi.object({
  questions: Joi.array()
    .items(createBankQuestionBodySchema)
    .min(1)
    .max(500)
    .required(),
});

/// "Add these bank rows to this quiz." Body: `{ questionIds: [..] }`. The
/// controller copies each bank question + its options into a fresh
/// `QuizQuestion` so later edits to the bank row don't mutate the quiz.
export const importToQuizBodySchema = Joi.object({
  questionIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .max(200)
    .required(),
});

/// AI-generate questions via Claude. The model returns the questions; the
/// teacher then reviews + cherry-picks which to save via the existing bulk
/// import endpoint. We don't persist anything here — the route is a pure
/// "generate and return" pipe.
export const generateQuestionsBodySchema = Joi.object({
  // Free-form teacher instruction. Required because without it the model
  // has nothing to anchor on; we cap length to keep the prompt cost bounded.
  prompt: Joi.string().trim().min(3).max(5000).required(),
  // Optional pasted material — a chapter, lecture transcript, etc. Capped at
  // ~30k chars (~7-8k tokens) so the input cost stays predictable. If the
  // teacher needs more context, they should chunk by topic.
  sourceMaterial: Joi.string().allow("").max(30000).optional(),
  count: Joi.number().integer().min(1).max(25).default(10),
  questionTypes: Joi.array()
    .items(Joi.string().valid("MCQ", "TRUE_FALSE", "SHORT_ANSWER"))
    .max(3)
    .default([]),
  difficulty: Joi.string()
    .valid("easy", "medium", "hard", "mixed")
    .default("mixed"),
});
