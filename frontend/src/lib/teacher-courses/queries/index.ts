import { useQuery } from '@/lib/async-query';
import {
  getTeacherCourses,
  getCourseDetail,
  getCourseReportsList,
  getCourseReportDetail,
  getStudentReportsList,
  getStudentReportDetail,
  getLecturerReportsList,
  getLecturerReportDetail,
  getBatchReportsList,
  getBatchReportDetail,
  getFacultyReportsList,
  getFacultyReportDetail
} from '../services';
import type { CourseReportListParams } from '../course-report-types';
import type { StudentReportListParams } from '../student-report-types';
import type { LecturerReportListParams } from '../lecturer-report-types';
import type { BatchReportListParams } from '../batch-report-types';
import type { FacultyReportListParams } from '../faculty-report-types';

/** Heavy report lists — long cache, slow poll, never flash a full reload. */
const REPORT_LIST_STALE_MS = 120_000;
const REPORT_LIST_REFETCH_MS = 120_000;

export const useTeacherCourses = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['teacher-courses'],
    queryFn: getTeacherCourses,
    enabled
  });
};

export const useCourseDetail = (offeringId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['teacher-course-detail', offeringId],
    queryFn: () => getCourseDetail(offeringId),
    enabled: !!offeringId && enabled
  });
};

export const useCourseReportsList = (
  enabled: boolean = true,
  params?: CourseReportListParams
) => {
  return useQuery({
    queryKey: [
      'teacher-course-reports',
      params?.from ?? null,
      params?.to ?? null,
      params?.page ?? 1,
      params?.pageSize ?? 25,
      params?.q ?? '',
      params?.department ?? 'all',
      params?.courseId ?? 'all',
      params?.sort ?? 'courseCode-asc'
    ],
    queryFn: () => getCourseReportsList(params),
    enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true
  });
};

export const useCourseReportDetail = (offeringId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['teacher-course-report', offeringId],
    queryFn: () => getCourseReportDetail(offeringId),
    enabled: !!offeringId && enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false
  });
};

export const useStudentReportsList = (
  enabled: boolean = true,
  params?: StudentReportListParams
) => {
  return useQuery({
    queryKey: [
      'teacher-student-reports',
      params?.from ?? null,
      params?.to ?? null,
      params?.page ?? 1,
      params?.pageSize ?? 25,
      params?.q ?? '',
      params?.department ?? 'all',
      params?.courseId ?? 'all',
      params?.studentId ?? 'all',
      params?.status ?? 'all',
      params?.sort ?? 'studentName-asc'
    ],
    queryFn: () => getStudentReportsList(params),
    enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true
  });
};

export const useStudentReportDetail = (
  studentId: number | null,
  offeringId: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['teacher-student-report', studentId, offeringId],
    queryFn: () => getStudentReportDetail(studentId!, offeringId),
    enabled: !!studentId && !!offeringId && enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false
  });
};

export const useLecturerReportsList = (
  enabled: boolean = true,
  params?: LecturerReportListParams
) => {
  return useQuery({
    queryKey: [
      'faculty-lecturer-reports',
      params?.from ?? null,
      params?.to ?? null,
      params?.page ?? 1,
      params?.pageSize ?? 25,
      params?.q ?? '',
      params?.department ?? 'all',
      params?.lecturerId ?? 'all',
      params?.sort ?? 'name-asc'
    ],
    queryFn: () => getLecturerReportsList(params),
    enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true
  });
};

export const useLecturerReportDetail = (
  teacherId: number | null,
  enabled: boolean = true,
  params?: { from?: string | null; to?: string | null }
) => {
  return useQuery({
    queryKey: [
      'faculty-lecturer-report',
      teacherId,
      params?.from ?? null,
      params?.to ?? null
    ],
    queryFn: () => getLecturerReportDetail(teacherId!, params),
    enabled: !!teacherId && enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false
  });
};

export const useBatchReportsList = (
  enabled: boolean = true,
  params?: BatchReportListParams
) => {
  return useQuery({
    queryKey: [
      'faculty-batch-reports',
      params?.from ?? null,
      params?.to ?? null,
      params?.page ?? 1,
      params?.pageSize ?? 25,
      params?.q ?? '',
      params?.department ?? 'all',
      params?.batchId ?? 'all',
      params?.status ?? 'ACTIVE',
      params?.sort ?? 'name-asc'
    ],
    queryFn: () => getBatchReportsList(params),
    enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true
  });
};

export const useBatchReportDetail = (
  batchId: number | null,
  enabled: boolean = true,
  params?: { from?: string | null; to?: string | null }
) => {
  return useQuery({
    queryKey: [
      'faculty-batch-report',
      batchId,
      params?.from ?? null,
      params?.to ?? null
    ],
    queryFn: () => getBatchReportDetail(batchId!, params),
    enabled: !!batchId && enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false
  });
};

export const useFacultyReportsList = (
  enabled: boolean = true,
  params?: FacultyReportListParams
) => {
  return useQuery({
    queryKey: [
      'super-admin-faculty-reports',
      params?.from ?? null,
      params?.to ?? null,
      params?.page ?? 1,
      params?.pageSize ?? 25,
      params?.q ?? '',
      params?.facultyId ?? 'all',
      params?.sort ?? 'name-asc'
    ],
    queryFn: () => getFacultyReportsList(params),
    enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true
  });
};

export const useFacultyReportDetail = (
  facultyId: number | null,
  enabled: boolean = true,
  params?: { from?: string | null; to?: string | null }
) => {
  return useQuery({
    queryKey: [
      'super-admin-faculty-report',
      facultyId,
      params?.from ?? null,
      params?.to ?? null
    ],
    queryFn: () => getFacultyReportDetail(facultyId!, params),
    enabled: !!facultyId && enabled,
    staleTime: REPORT_LIST_STALE_MS,
    refetchInterval: REPORT_LIST_REFETCH_MS,
    refetchOnWindowFocus: false
  });
};
