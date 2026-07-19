import { apiClient } from '@/lib/api-client';
import type {
  Course,
  CourseOffering,
  DeanAnalytics,
  DeanBatch,
  DeanReports,
  DeanSection,
  DeanUser,
  DeanUsersListResponse,
} from './dean-api-types';

const BASE = '/dean';

type DeanUsersPaginatedApi = {
  results: DeanUser[];
  total: number;
  page: number;
  pageSize: number;
};

export const deanApi = {
  getUsers: async (params?: Record<string, string>): Promise<DeanUsersListResponse> => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const raw = await apiClient<DeanUsersPaginatedApi>(`${BASE}/users${query}`);
    return {
      users: raw.results ?? [],
      pagination: { total: raw.total ?? 0, page: raw.page ?? 1, pageSize: raw.pageSize ?? 20 },
    };
  },

  getUserById: (id: number) => apiClient<{ user: DeanUser }>(`${BASE}/users/${id}`),

  getClubStats: () =>
    apiClient<{ approved: number; pending: number; suspended: number; rejected: number; total: number }>(
      '/clubs/dean/stats'
    ),

  getBatches: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{
      batches: DeanBatch[];
      count?: number;
      page?: number;
      pageSize?: number;
      totalCount?: number;
      status?: string;
    }>(`${BASE}/batches${query}`);
  },

  getBatchById: (id: number) => apiClient<{ batch: DeanBatch }>(`${BASE}/batches/${id}`),

  getBatchSections: (batchId: number) =>
    apiClient<{ sections: DeanSection[] }>(`${BASE}/batches/${batchId}/sections`),

  getSectionById: (id: number) => apiClient<{ section: DeanSection }>(`${BASE}/sections/${id}`),

  getTeachers: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ teachers: DeanUser[] }>(`${BASE}/teachers${query}`);
  },

  getCourses: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{
      courses: Course[];
      count?: number;
      page?: number;
      pageSize?: number;
      totalCount?: number;
      status?: string;
    }>(`${BASE}/courses${query}`);
  },

  getCourseById: (id: number) => apiClient<{ course: Course }>(`${BASE}/courses/${id}`),

  getOfferings: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ offerings: CourseOffering[] }>(`${BASE}/offerings${query}`);
  },

  getAnalytics: () => apiClient<DeanAnalytics>(`${BASE}/analytics`),

  getReports: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<DeanReports>(`${BASE}/reports${query}`);
  },
};
