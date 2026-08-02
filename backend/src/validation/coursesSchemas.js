import Joi from "joi";

// House pattern: Joi via validateBody (see calendarSchemas.js, quizSchemas.js,
// questionBankSchemas.js) — matches the other academic-domain schemas.

export const createCourseBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  code: Joi.string().trim().min(1).max(50).required(),
  departmentId: Joi.number().integer().positive().required(),
  description: Joi.string().trim().allow("", null).max(5000).optional(),
  credits: Joi.number().min(0).max(30).default(3),
  thumbnail: Joi.string().trim().allow("", null).max(2000).optional(),
  semesterNumber: Joi.number().integer().min(1).max(12).allow(null, "").optional(),
});

export const updateCourseBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  code: Joi.string().trim().min(1).max(50).optional(),
  departmentId: Joi.number().integer().positive().optional(),
  description: Joi.string().trim().allow("", null).max(5000).optional(),
  credits: Joi.number().min(0).max(30).optional(),
  thumbnail: Joi.string().trim().allow("", null).max(2000).optional(),
  semesterNumber: Joi.number().integer().min(1).max(12).allow(null, "").optional(),
}).min(1);
