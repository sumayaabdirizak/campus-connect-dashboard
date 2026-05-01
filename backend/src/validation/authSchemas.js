import Joi from "joi";

export const loginBodySchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).max(4096).required(),
});

export const registerUserBodySchema = Joi.object({
  full_name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(200).required(),
  role: Joi.string()
    .valid("STUDENT", "TEACHER", "DEAN", "FACULTY_ADMIN", "SUPER_ADMIN")
    .required(),
  number: Joi.string().trim().min(1).max(64).required(),
  departmentCode: Joi.string().trim().max(32).optional(),
  programId: Joi.number().integer().positive().optional(),
  specialty: Joi.string().trim().max(200).optional(),
  batchSectionId: Joi.number().integer().positive().optional(),
  academicYearId: Joi.number().integer().positive().optional(),
  semesterId: Joi.number().integer().positive().optional(),
  courseIds: Joi.array().items(Joi.number().integer().positive()).optional(),
});
