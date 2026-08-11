import * as z from 'zod';

export type FacultyOption = {
  id: number;
  name: string;
  code: string;
};

export type FacultiesResponse = {
  faculties?: FacultyOption[];
  results?: FacultyOption[];
};

export const facultySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().trim().min(1, 'Code is required'),
  defaultDurationYears: z.coerce.number().int().min(1).max(10),
  description: z.string().optional(),
  established: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

export type FacultyFormValues = z.infer<typeof facultySchema>;
