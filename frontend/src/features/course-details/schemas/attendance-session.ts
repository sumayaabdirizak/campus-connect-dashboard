import * as z from 'zod';

/**
 * Zod schema for the "new class session" form (attendance tab). Mirrors the
 * backend's createSession contract:
 *   - `day_of_week` 0–6 (Sunday=0, matching JS Date.getDay())
 *   - `start_time` / `end_time` HH:MM (24-hour, native <input type='time'>)
 *   - `location` is the only strictly-required free-text field; everything
 *     else can be filled in later by an edit
 *
 * Refinement: end_time must come after start_time. We don't enforce a
 * minimum class length because the teacher might want a 30-min recitation.
 */
export const attendanceSessionSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24-hour)'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24-hour)'),
    location: z.string().trim().min(1, 'Location is required').max(120),
    topic: z.string().trim().max(200).optional().default(''),
    is_lab: z.boolean().default(false)
  })
  .refine((v) => v.end_time > v.start_time, {
    message: 'End time must be after start time',
    path: ['end_time']
  });

export type AttendanceSessionFormValues = z.infer<typeof attendanceSessionSchema>;
