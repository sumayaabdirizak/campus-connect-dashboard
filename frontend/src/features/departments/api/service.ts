import { apiClient } from '@/lib/api-client';

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  facultyId: number;
  faculty?: {
    id: number;
    name: string;
  };
  levels?: {
    id: number;
    level: string;
  }[];
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentsResponse {
  message: string;
  departments: Department[];
}

export const fetchDepartments = async () => {
  return apiClient<DepartmentsResponse>('/departments');
};
