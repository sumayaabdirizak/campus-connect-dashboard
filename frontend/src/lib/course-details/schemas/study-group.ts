import * as z from 'zod';

/**
 * Schema for the "Create Group" dialog on the Groups tab. Mirrors the
 * backend's createGroup contract — just a name for now. Future fields
 * (description, max-members, visibility) plug in here.
 *
 * `.trim()` after `.min(1)` so a name that's only whitespace is rejected
 * BEFORE the form reaches submit, matching the old imperative check.
 */
export const studyGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name is required')
    .max(120, 'Keep it under 120 characters')
});

export type StudyGroupFormValues = z.infer<typeof studyGroupSchema>;
