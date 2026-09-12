import { z } from 'zod';
import type { AssignmentGradingScope, AssignmentWorkMode } from '@/lib/course-details/services/assignments-types';
import { serverNow } from '@/lib/server-clock';

export const assignmentSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(160),
    description: z.string().max(2000).optional().or(z.literal('')),
    open_at: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => {
        if (!v) return true;
        const d = new Date(v);
        return !Number.isNaN(d.getTime()) && d.getTime() > serverNow();
      }, 'Pick a future date and time'),
    due_date: z
      .string()
      .min(1, 'Due date is required')
      .refine((v) => {
        const d = new Date(v);
        return !Number.isNaN(d.getTime()) && d.getTime() > serverNow();
      }, 'Pick a future date and time'),
    workMode: z.enum(['INDIVIDUAL', 'GROUP']),
    gradingScope: z.enum(['INDIVIDUAL', 'GROUP']),
    allowLate: z.boolean(),
    maxMarks: z.number().int().min(1, 'Must be at least 1').max(100, 'Cannot exceed 100 course marks')
  })
  .superRefine((v, ctx) => {
    if (v.workMode === 'INDIVIDUAL' && v.gradingScope === 'GROUP') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gradingScope'],
        message: 'Solo work cannot use group grading'
      });
    }
    if (v.open_at && new Date(v.open_at) >= new Date(v.due_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['open_at'],
        message: 'Open time must be before the due date'
      });
    }
  });

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export const defaultAssignmentValues: AssignmentFormValues = {
  title: '',
  description: '',
  open_at: '',
  due_date: '',
  workMode: 'INDIVIDUAL' as AssignmentWorkMode,
  gradingScope: 'INDIVIDUAL' as AssignmentGradingScope,
  allowLate: false,
  maxMarks: 10
};
