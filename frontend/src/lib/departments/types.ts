import * as z from 'zod';

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  facultyId: number;
  faculty?: {
    id: number;
    name: string;
    defaultDurationYears?: number;
  };
  programs?: {
    id: number;
    level: 'UNDERGRADUATE' | 'POSTGRADUATE';
  }[];
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentsResponse {
  message: string;
  departments: Department[];
  status?: string;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  results?: Department[];
}

export const departmentSchema = z.object({
  facultyId: z.string().min(1, 'Faculty is required'),
  name: z.string().min(2, 'Department name is required'),
  code: z.string().trim().min(1, 'Code is required'),
  established: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
