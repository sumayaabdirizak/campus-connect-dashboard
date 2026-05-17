import * as z from 'zod';

export const departmentSchema = z.object({
  facultyId: z.number(),
  name: z.string().min(2, 'Department name is required'),
  code: z.string().optional(),
  established: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
