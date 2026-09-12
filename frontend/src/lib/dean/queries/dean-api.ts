import { apiClient } from '@/lib/api-client';
import type {
  DeanUser,
  DeanBatch,
  DeanSection,
  TeacherAssigning,
  CourseOffering,
  Course,
  DeanUsersListResponse,
  DeanAnalytics,
  DeanReports,
  DeanStudentReportRow,
  DeanInstructorReportRow,
  DeanCourseReportRow,
  DeanDepartmentReportRow,
  DeanAssessmentMetrics,
  DeanRiskStudent,
  DeanRiskCourse,
  DeanRiskDepartment,
  DeanActivityItem,
} from '../types';

export type {
  DeanUser,
  DeanBatch,
  DeanSection,
  TeacherAssigning,
  CourseOffering,
  Course,
  DeanUsersListResponse,
  DeanAnalytics,
  DeanReports,
  DeanStudentReportRow,
  DeanInstructorReportRow,
  DeanCourseReportRow,
  DeanDepartmentReportRow,
  DeanAssessmentMetrics,
  DeanRiskStudent,
  DeanRiskCourse,
  DeanRiskDepartment,
  DeanActivityItem,
};

function withQuery(path: string, params?: Record<string, string>) {
  if (!params || Object.keys(params).length === 0) return path;
  const qs = new URLSearchParams(params).toString();
  return `${path}?${qs}`;
}

// API client for dean operations
export const deanApi = {
  getUsers: (params?: Record<string, string>) =>
    apiClient<DeanUsersListResponse & { results?: DeanUser[]; total?: number; totalCount?: number }>(
      withQuery('/dean/users', params),
      { method: 'GET' }
    ),
  getUserById: (id: number) =>
    apiClient<any>(`/dean/users/${id}`, { method: 'GET' }),
  getClubStats: () =>
    apiClient<any>('/dean/club-stats', { method: 'GET' }),
  getBatches: (params?: Record<string, string>) =>
    apiClient<any>(withQuery('/dean/batches', params), { method: 'GET' }),
  getBatch: (id: number) =>
    apiClient<any>(`/dean/batches/${id}`, { method: 'GET' }),
  getBatchById: (id: number) =>
    apiClient<any>(`/dean/batches/${id}`, { method: 'GET' }),
  getBatchSections: (batchId: number) =>
    apiClient<any>(`/dean/batches/${batchId}/sections`, { method: 'GET' }),
  getSection: (id: number) =>
    apiClient<any>(`/dean/sections/${id}`, { method: 'GET' }),
  getTeachers: (params?: Record<string, string>) =>
    apiClient<any>(withQuery('/dean/teachers', params), { method: 'GET' }),
  getCourses: (params?: Record<string, string>) =>
    apiClient<any>(withQuery('/dean/courses', params), { method: 'GET' }),
  getCourse: (id: number) =>
    apiClient<any>(`/dean/courses/${id}`, { method: 'GET' }),
  getCourseById: (id: number) =>
    apiClient<any>(`/dean/courses/${id}`, { method: 'GET' }),
  getOfferings: (params?: Record<string, string>) =>
    apiClient<any>(withQuery('/dean/offerings', params), { method: 'GET' }),
  createCourse: (body: {
    name: string;
    code: string;
    departmentId: number;
    description?: string;
    credits?: number;
    semesterNumber?: number | null;
    year?: number | null;
    maxMarks?: number;
    status?: 'ACTIVE' | 'INACTIVE';
  }) =>
    apiClient<{ message: string; course: Course }>('/dean/courses', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  assignTeacherToCourse: (courseId: number, teacherId: number) =>
    apiClient(`/dean/courses/${courseId}/teachers`, {
      method: 'POST',
      body: JSON.stringify({ teacherId })
    }),
  createOffering: (body: {
    courseId: number;
    sectionId: number;
    semesterId: number;
    academicYearId: number;
    teacherId?: number;
  }) =>
    apiClient('/dean/offerings', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  createOfferingsBulk: (body: {
    courseIds: number[];
    sectionId: number;
    semesterId: number;
    academicYearId: number;
  }) =>
    apiClient('/dean/offerings/bulk', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  getAnalytics: () =>
    apiClient<DeanAnalytics>('/dean/analytics', { method: 'GET' }),
  getReports: (params?: Record<string, string>) =>
    apiClient<DeanReports>(withQuery('/dean/reports', params), { method: 'GET' }),
};
