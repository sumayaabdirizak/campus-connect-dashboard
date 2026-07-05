import { useQuery } from '@/lib/async-query';
import { deanApi } from './dean-api';

// ── Query Keys ─────────────────────────────────────────────────────────────
export const deanKeys = {
  users: (params?: any) => ['dean', 'users', params] as const,
  user: (id: number) => ['dean', 'user', id] as const,
  batches: (params?: any) => ['dean', 'batches', params] as const,
  batch: (id: number) => ['dean', 'batch', id] as const,
  batchSections: (batchId: number) => ['dean', 'batch', batchId, 'sections'] as const,
  section: (id: number) => ['dean', 'section', id] as const,
  teachers: (params?: any) => ['dean', 'teachers', params] as const,
  courses: (params?: any) => ['dean', 'courses', params] as const,
  course: (id: number) => ['dean', 'course', id] as const,
  offerings: (params?: any) => ['dean', 'offerings', params] as const,
  analytics: () => ['dean', 'analytics'] as const,
  reports: (params?: Record<string, string>) => ['dean', 'reports', params] as const,
};

// ── Users ──────────────────────────────────────────────────────────────────

export const useDeanUsers = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.users(params),
    queryFn: () => deanApi.getUsers(params)
  });

export const useDeanUser = (id: number) =>
  useQuery({
    queryKey: deanKeys.user(id),
    queryFn: () => deanApi.getUserById(id),
    enabled: !!id
  });

export const useDeanClubStats = () =>
  useQuery({
    queryKey: ['dean', 'clubs', 'stats'] as const,
    queryFn: () => deanApi.getClubStats()
  });

// ── Batches ────────────────────────────────────────────────────────────────

export const useDeanBatches = (params?: Record<string, string>, enabled: boolean = true) =>
  useQuery({
    queryKey: deanKeys.batches(params),
    queryFn: () => deanApi.getBatches(params),
    enabled
  });

export const useDeanBatch = (id: number) =>
  useQuery({
    queryKey: deanKeys.batch(id),
    queryFn: () => deanApi.getBatchById(id),
    enabled: !!id
  });

export const useBatchSections = (batchId: number, enabled: boolean = true) =>
  useQuery({
    queryKey: deanKeys.batchSections(batchId),
    queryFn: () => deanApi.getBatchSections(batchId),
    enabled: !!batchId && enabled
  });

// ── Teachers ───────────────────────────────────────────────────────────────

export const useDeanTeachers = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.teachers(params),
    queryFn: () => deanApi.getTeachers(params)
  });

// ── Courses ───────────────────────────────────────────────────────────────

export const useDeanCourses = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.courses(params),
    queryFn: () => deanApi.getCourses(params)
  });

export const useDeanCourse = (id: number) =>
  useQuery({
    queryKey: deanKeys.course(id),
    queryFn: () => deanApi.getCourseById(id),
    enabled: !!id
  });

// ── Offerings ──────────────────────────────────────────────────────────────

export const useDeanOfferings = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.offerings(params),
    queryFn: () => deanApi.getOfferings(params)
  });

export const useDeanAnalytics = () =>
  useQuery({
    queryKey: deanKeys.analytics(),
    queryFn: () => deanApi.getAnalytics(),
    staleTime: 60_000,
  });

export const useDeanReports = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.reports(params),
    queryFn: () => deanApi.getReports(params),
    staleTime: 60_000,
  });
