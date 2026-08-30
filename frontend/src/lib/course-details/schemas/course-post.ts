import * as z from 'zod';

/** Create / edit course feed post — text only (title + body). */
export const coursePostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  content: z.string().trim().min(1, 'Content is required').max(10_000)
});

export type CoursePostFormValues = z.infer<typeof coursePostSchema>;
