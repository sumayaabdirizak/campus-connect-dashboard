import Joi from "joi";

export const loginBodySchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).max(4096).required(),
});

export const registerUserBodySchema = Joi.object({
  full_name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(200).required(),
  /** Built-in or custom Role.name (must exist in DB). */
  role: Joi.string().trim().min(2).max(32).pattern(/^[A-Za-z][A-Za-z0-9_]*$/).required(),
  /** Optional — auto-generated from batch/role when omitted. */
  number: Joi.string().trim().max(64).empty('').optional().allow(null),
  departmentCode: Joi.string().trim().max(32).empty('').optional(),
  facultyId: Joi.number().integer().positive().optional(),
  programId: Joi.number().integer().positive().optional(),
  specialty: Joi.string().trim().max(200).empty('').optional(),
  batchSectionId: Joi.number().integer().positive().optional(),
  academicYearId: Joi.number().integer().positive().optional(),
  semesterId: Joi.number().integer().positive().optional(),
  courseIds: Joi.array().items(Joi.number().integer().positive()).optional().default([]),
  /** Optional: assign new user as office staff in the same request. */
  officeId: Joi.number().integer().positive().optional(),
  officeStaffRole: Joi.string().valid('AGENT', 'MANAGER').optional().default('AGENT'),
});

export const registerStudentsBulkBodySchema = Joi.object({
  password: Joi.string().min(8).max(200).required(),
  batchSectionId: Joi.number().integer().positive().required(),
  academicYearId: Joi.number().integer().positive().required(),
  semesterId: Joi.number().integer().positive().required(),
  students: Joi.array()
    .items(
      Joi.object({
        full_name: Joi.string().trim().min(1).max(200).required(),
        email: Joi.string().email().required(),
      })
    )
    .min(1)
    .max(200)
    .required(),
});

export const patchMeBodySchema = Joi.object({
  smsOptIn: Joi.boolean().required(),
});

export const changePasswordBodySchema = Joi.object({
  currentPassword: Joi.string().min(1).max(4096).required(),
  newPassword: Joi.string().min(8).max(200).required(),
});

export const adminUpdateUserBodySchema = Joi.object({
  full_name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email().required(),
  number: Joi.string().trim().min(1).max(64).required(),
  /** Set/replace office staff membership; omit to leave unchanged. null clears. */
  officeId: Joi.number().integer().positive().allow(null).optional(),
  officeStaffRole: Joi.string().valid('AGENT', 'MANAGER').optional().default('AGENT'),
});
