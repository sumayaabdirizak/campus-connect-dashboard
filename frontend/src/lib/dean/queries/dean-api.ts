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

// API client for dean operations
export const deanApi = {
  getUsers: (params?: Record<string, string>) =>
    apiClient<{ users: any[] }>('/dean/users', { method: 'GET' }),
  getUserById: (id: number) =>
    apiClient<any>(`/dean/users/${id}`, { method: 'GET' }),
  getClubStats: () =>
    apiClient<any>('/dean/club-stats', { method: 'GET' }),
  getBatches: (params?: Record<string, string>) =>
    apiClient<any>('/dean/batches', { method: 'GET' }),
  getBatch: (id: number) =>
    apiClient<any>(`/dean/batches/${id}`, { method: 'GET' }),
  getBatchById: (id: number) =>
    apiClient<any>(`/dean/batches/${id}`, { method: 'GET' }),
  getBatchSections: (batchId: number) =>
    apiClient<any>(`/dean/batches/${batchId}/sections`, { method: 'GET' }),
  getSection: (id: number) =>
    apiClient<any>(`/dean/sections/${id}`, { method: 'GET' }),
  getTeachers: (params?: Record<string, string>) =>
    apiClient<any>('/dean/teachers', { method: 'GET' }),
  getCourses: (params?: Record<string, string>) =>
    apiClient<any>('/dean/courses', { method: 'GET' }),
  getCourse: (id: number) =>
    apiClient<any>(`/dean/courses/${id}`, { method: 'GET' }),
  getCourseById: (id: number) =>
    apiClient<any>(`/dean/courses/${id}`, { method: 'GET' }),
  getOfferings: (params?: Record<string, string>) =>
    apiClient<any>('/dean/offerings', { method: 'GET' }),
  getAnalytics: () =>
    apiClient<DeanAnalytics>('/dean/analytics', { method: 'GET' }),
  getReports: (params?: Record<string, string>) =>
    apiClient<DeanReports>('/dean/reports', { method: 'GET' }),
};
