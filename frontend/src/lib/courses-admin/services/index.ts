import { apiClient } from '@/lib/api-client';

export interface AdminCourse {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  credits: number;
  department: { id: number; name: string; code: string };
  teacherAssignings?: {
    teacher: { id: number; full_name: string; email: string };
  }[];
  _count?: { teacherAssignings: number };
}

export interface AdminCoursesResponse {
  message: string;
  courses: AdminCourse[];
}

export const fetchAdminCourses = (params?: { departmentId?: string }) => {
  const query = params?.departmentId ? `?departmentId=${params.departmentId}` : '';
  return apiClient<AdminCoursesResponse>(`/courses${query}`, { method: 'GET' });
};
