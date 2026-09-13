import Joi from "joi";

// House pattern: Joi via validateBody (see calendarSchemas.js, quizSchemas.js,
// questionBankSchemas.js) — matches the other academic-domain schemas.

export const createDepartmentBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  code: Joi.string().trim().min(1).max(50).required(),
  facultyId: Joi.number().integer().positive().required(),
});

export const updateDepartmentBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  code: Joi.string().trim().min(1).max(50).optional(),
  facultyId: Joi.number().integer().positive().optional(),
  headUserId: Joi.number().integer().positive().allow(null, "").optional(),
}).min(1);
