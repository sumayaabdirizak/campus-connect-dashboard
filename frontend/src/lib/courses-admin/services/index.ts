import { apiClient } from '@/lib/api-client';

export interface AdminCourse {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  credits: number;
  status?: string;
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

export const fetchAdminCourses = (params?: {
  departmentId?: string;
  facultyId?: string;
}) => {
  const qs = new URLSearchParams();
  if (params?.departmentId) qs.set('departmentId', params.departmentId);
  if (params?.facultyId) qs.set('facultyId', params.facultyId);
  const query = qs.toString();
  return apiClient<AdminCoursesResponse>(`/courses${query ? `?${query}` : ''}`, {
    method: 'GET'
  });
};
