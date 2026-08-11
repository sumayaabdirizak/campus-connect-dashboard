import * as z from 'zod';

export interface UserOfficeStaff {
  officeId: number;
  role: 'AGENT' | 'MANAGER';
  office: { id: number; name: string; slug: string };
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  number?: string;
  phone?: string;
  role: string;
  roleId?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  officeStaff?: UserOfficeStaff | null;
}

export type UserFilters = {
  page?: number;
  limit?: number;
  roles?: string;
  search?: string;
  sort?: string;
};

export type UsersResponse = {
  message: string;
  total_users: number;
  users: User[];
};

export type UserMutationPayload = {
  full_name: string;
  email: string;
  password?: string;
  role: string;
  departmentCode?: string;
};

export const userSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(1, 'Phone number is required'),
  role: z.string().min(1, 'Please select a role'),
  status: z.string().min(1, 'Please select a status')
});

export type UserFormValues = z.infer<typeof userSchema>;
