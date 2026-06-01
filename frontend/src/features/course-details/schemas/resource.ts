import * as z from 'zod';

/// Resource type union — must stay in lock-step with the backend's
/// `ResourceType` enum + the `RESOURCE_TYPES` array in `resource-form.tsx`.
/// Kept here so the schema can validate it as part of submit, but the
/// canonical list (with display order) still lives next to the form.
export const RESOURCE_TYPE_VALUES = [
  'SYLLABUS',
  'ASSIGNMENT',
  'LECTURE_NOTE',
  'VIDEO',
  'AUDIO',
  'EXTERNAL_LINK',
  'OTHER'
] as const;

/**
 * Schema for the create/edit resource form. The form is sticky (one
 * schema, two modes), with edit mode just hiding the file-picker + the
 * recorder. Validation rules stay constant between modes — the backend
 * accepts an in-place URL change as long as it's non-empty.
 *
 * `originalName` and `mimeType` are optional because they're only set
 * after a file upload; pasting a raw URL leaves them null and the backend
 * is fine with that.
 */
export const resourceFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  description: z.string().trim().max(5000).optional().default(''),
  url: z.string().trim().min(1, 'Provide a file or paste a URL').max(2048),
  type: z.enum(RESOURCE_TYPE_VALUES),
  originalName: z.string().nullable().default(null),
  mimeType: z.string().nullable().default(null),
  moduleId: z.number().int().positive().nullable().default(null),
  is_draft: z.boolean().default(false)
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;
