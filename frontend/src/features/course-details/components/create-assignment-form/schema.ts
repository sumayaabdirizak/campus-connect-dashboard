import { z } from 'zod';
import type { AssignmentGradingScope, AssignmentWorkMode } from '../../api/assignments-types';

export const assignmentSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(160),
    description: z.string().max(2000).optional().or(z.literal('')),
    open_at: z.string().optional().or(z.literal('')),
    due_date: z.string().min(1, 'Due date is required'),
    workMode: z.enum(['INDIVIDUAL', 'GROUP']),
    gradingScope: z.enum(['INDIVIDUAL', 'GROUP']),
    allowLate: z.boolean(),
    lateWindow: z.string().regex(/^\d+$/, 'Must be a number').or(z.literal('')),
    maxMarks: z.number().int().min(1, 'Must be at least 1').max(100, 'Cannot exceed 100')
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
  lateWindow: '0',
  maxMarks: 100
};
