import Joi from "joi";
import { z } from "zod";
import {
  normalizePublishedAt,
  validatePublishedAtForScheduleUpsert,
} from "../services/announcementService.js";

export const smsAuditListQuerySchema = Joi.object({
  userId: Joi.number().integer().positive().optional(),
  announcementId: Joi.number().integer().positive().optional(),
  dateFrom: Joi.string().trim().max(40).optional(),
  dateTo: Joi.string().trim().max(40).optional(),
}).unknown(true);

export const ackListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(500).optional(),
  filter: Joi.string().valid("all", "acked", "pending").optional(),
  format: Joi.string().valid("json", "csv").optional(),
}).unknown(true);

export const trackableLinkBodySchema = z.object({
  url: z.string().url().max(4000),
});

export const announcementTargetRowSchema = z.object({
  scopeType: z.enum(["FACULTY", "DEPARTMENT", "BATCH", "SECTION"]),
  scopeId: z.coerce.number().int().positive(),
});

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, "title is required"),
    content: z.string().trim().min(1, "content is required"),
    priority: z.enum(["normal", "important", "urgent"]).default("normal"),
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    imageUrls: z.array(z.string().trim().min(1)).max(20).default([]),
    targetRoles: z.array(z.string().trim().min(1)).max(50).optional().default([]),
    publishedAt: z.union([z.string(), z.null()]).optional(),
    expiresAt: z.union([z.string(), z.null()]).optional(),
    deadlineAt: z.union([z.string(), z.null()]).optional(),
    notifySms: z.coerce.boolean().optional(),
    isPinned: z.coerce.boolean().optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).optional(),
    targets: z.array(announcementTargetRowSchema).max(50).optional(),
    bodyMarkdown: z.string().optional(),
    bodyHtml: z.string().optional(),
    acknowledgementRequired: z.coerce.boolean().optional(),
    commentsEnabled: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "FACULTY" && !data.facultyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facultyId"],
        message: "facultyId is required for FACULTY targetType",
      });
    }
    if (data.targetType === "DEPARTMENT" && !data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "departmentId is required for DEPARTMENT targetType",
      });
    }
    if (data.targetType === "BATCH" && !data.batchId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["batchId"], message: "batchId is required for BATCH targetType" });
    }
    if (data.targetType === "SECTION" && !data.sectionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sectionId"],
        message: "sectionId is required for SECTION targetType",
      });
    }
    if (data.targetType !== "FACULTY" && data.facultyId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facultyId"],
        message: "facultyId is only allowed for FACULTY targetType",
      });
    }
    if (data.targetType !== "DEPARTMENT" && data.departmentId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "departmentId is only allowed for DEPARTMENT targetType",
      });
    }
    if (data.targetType !== "BATCH" && data.batchId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["batchId"], message: "batchId is only allowed for BATCH targetType" });
    }
    if (data.targetType !== "SECTION" && data.sectionId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sectionId"],
        message: "sectionId is only allowed for SECTION targetType",
      });
    }
    const pub = normalizePublishedAt(data.publishedAt);
    if (pub) {
      const chk = validatePublishedAtForScheduleUpsert({ status: data.status, publishedAt: pub });
      if (!chk.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["publishedAt"],
          message: chk.message,
        });
      }
    }
  });

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    priority: z.enum(["normal", "important", "urgent"]).optional(),
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]).optional(),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    targetRoles: z.array(z.string().trim().min(1)).min(1, "At least one target role is required").optional(),
    publishedAt: z.union([z.string(), z.null()]).optional(),
    expiresAt: z.union([z.string(), z.null()]).optional(),
    deadlineAt: z.union([z.string(), z.null()]).optional(),
    isPinned: z.coerce.boolean().optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]).optional(),
    targets: z.array(announcementTargetRowSchema).max(50).optional(),
    bodyMarkdown: z.string().optional(),
    bodyHtml: z.string().optional(),
    acknowledgementRequired: z.coerce.boolean().optional(),
    commentsEnabled: z.coerce.boolean().optional(),
  })
  .strict();

export const readBulkSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

const csvIntList = z
  .union([z.string(), z.array(z.union([z.string(), z.number()]))])
  .optional()
  .transform((val) => {
    if (val == null) return [];
    const arr = Array.isArray(val) ? val : String(val).split(",");
    return arr
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
  });

export const previewRecipientsSchema = z
  .object({
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    departmentIds: csvIntList,
    batchIds: csvIntList,
    sectionIds: csvIntList,
    targetRoles: z.union([z.string(), z.array(z.string().trim().min(1))]).optional(),
  })
  .strict();
