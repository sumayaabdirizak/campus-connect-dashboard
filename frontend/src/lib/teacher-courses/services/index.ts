import { apiClient } from '@/lib/api-client';
import { uploadJson } from '@/lib/upload-client';
import type { Course, CourseOfferingDetail } from '../types';
import type {
  CourseReportDetail,
  CourseReportListParams,
  CourseReportListResponse
} from '../course-report-types';
import type {
  StudentReportDetail,
  StudentReportListParams,
  StudentReportListResponse
} from '../student-report-types';
import type {
  LecturerReportDetail,
  LecturerReportListParams,
  LecturerReportListResponse
} from '../lecturer-report-types';
import type {
  BatchReportDetail,
  BatchReportListParams,
  BatchReportListResponse
} from '../batch-report-types';

export const getTeacherCourses = async () => {
  return apiClient<Course[]>('/lecturer-portal/courses');
};

export const getCourseDetail = async (offeringId: string) => {
  return apiClient<CourseOfferingDetail>(`/lecturer-portal/courses/${offeringId}`);
};

type ListParams =
  | CourseReportListParams
  | StudentReportListParams
  | LecturerReportListParams
  | BatchReportListParams;

function appendListParams(q: URLSearchParams, params?: ListParams) {
  if (!params) return;
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.page != null) q.set('page', String(params.page));
  if (params.pageSize != null) q.set('pageSize', String(params.pageSize));
  if (params.q) q.set('q', params.q);
  if (params.department && params.department !== 'all') q.set('department', params.department);
  if ('courseId' in params && params.courseId && params.courseId !== 'all') {
    q.set('courseId', params.courseId);
  }
  if (params.sort) q.set('sort', params.sort);
  if ('studentId' in params && params.studentId && params.studentId !== 'all') {
    q.set('studentId', params.studentId);
  }
  if ('lecturerId' in params && params.lecturerId && params.lecturerId !== 'all') {
    q.set('lecturerId', params.lecturerId);
  }
  if ('batchId' in params && params.batchId && params.batchId !== 'all') {
    q.set('batchId', params.batchId);
  }
  if ('status' in params && params.status) {
    q.set('status', params.status);
  }
}

export const getCourseReportsList = async (params?: CourseReportListParams) => {
  const q = new URLSearchParams();
  appendListParams(q, params);
  const qs = q.toString();
  return apiClient<CourseReportListResponse>(
    `/lecturer-portal/course-reports${qs ? `?${qs}` : ''}`
  );
};

export const getCourseReportDetail = async (offeringId: string) => {
  return apiClient<CourseReportDetail>(`/lecturer-portal/course-reports/${offeringId}`);
};

export const getStudentReportsList = async (params?: StudentReportListParams) => {
  const q = new URLSearchParams();
  appendListParams(q, params);
  const qs = q.toString();
  return apiClient<StudentReportListResponse>(
    `/lecturer-portal/student-reports${qs ? `?${qs}` : ''}`
  );
};

export const getStudentReportDetail = async (
  studentId: number,
  offeringId: string
) => {
  return apiClient<StudentReportDetail>(
    `/lecturer-portal/student-reports/${studentId}?offeringId=${encodeURIComponent(offeringId)}`
  );
};

export const getLecturerReportsList = async (params?: LecturerReportListParams) => {
  const q = new URLSearchParams();
  appendListParams(q, params);
  const qs = q.toString();
  return apiClient<LecturerReportListResponse>(
    `/lecturer-portal/lecturer-reports${qs ? `?${qs}` : ''}`
  );
};

export const getLecturerReportDetail = async (
  teacherId: number,
  params?: { from?: string | null; to?: string | null }
) => {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return apiClient<LecturerReportDetail>(
    `/lecturer-portal/lecturer-reports/${teacherId}${qs ? `?${qs}` : ''}`
  );
};

export const getBatchReportsList = async (params?: BatchReportListParams) => {
  const q = new URLSearchParams();
  appendListParams(q, params);
  const qs = q.toString();
  return apiClient<BatchReportListResponse>(
    `/lecturer-portal/batch-reports${qs ? `?${qs}` : ''}`
  );
};

export const getBatchReportDetail = async (
  batchId: number,
  params?: { from?: string | null; to?: string | null }
) => {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return apiClient<BatchReportDetail>(
    `/lecturer-portal/batch-reports/${batchId}${qs ? `?${qs}` : ''}`
  );
};

export interface CourseCoverResult {
  success: boolean;
  course: { id: number; name: string; code: string; thumbnail: string | null };
}

export const uploadCourseCover = async (
  offeringId: string,
  file: File
): Promise<CourseCoverResult> => {
  const fd = new FormData();
  fd.append('cover', file);
  return uploadJson<CourseCoverResult>(`/lecturer-portal/courses/${offeringId}/cover`, fd);
};
