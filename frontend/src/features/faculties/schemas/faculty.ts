import * as z from 'zod';

export const facultySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  established: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

export type FacultyFormValues = z.infer<typeof facultySchema>;
