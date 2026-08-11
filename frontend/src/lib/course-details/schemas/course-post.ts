import * as z from 'zod';

/**
 * Schema for the "Create New Post" dialog on the Feed tab.
 *
 * Only the strictly form-shaped fields are here. File attachments are
 * tracked as a separate `File[]` next to the form because:
 *   - Zod can't usefully validate a File object beyond `instanceof File`
 *   - The submit pipeline is two-step: create the post, THEN upload files
 *     against the new post id — they aren't part of the same JSON payload
 *
 * The 25 MB / file ceiling and 10-files cap are enforced in the form's
 * file-picker handler (with toast feedback) rather than via Zod, so the
 * user gets immediate validation feedback as they pick files instead of
 * having to wait until submit.
 */
export const coursePostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  content: z.string().trim().min(1, 'Content is required').max(10_000),
  isImportant: z.boolean().default(false)
});

export type CoursePostFormValues = z.infer<typeof coursePostSchema>;
