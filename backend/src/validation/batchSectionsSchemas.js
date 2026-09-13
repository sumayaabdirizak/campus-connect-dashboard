import Joi from "joi";

// House pattern: Joi via validateBody (see calendarSchemas.js, quizSchemas.js,
// questionBankSchemas.js) — matches the other academic-domain schemas.

export const createBatchSectionBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  batchId: Joi.number().integer().positive().required(),
});

export const updateBatchSectionBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  batchId: Joi.number().integer().positive().optional(),
  moderatorUserId: Joi.number().integer().positive().allow(null, "").optional(),
}).min(1);
