import { apiClient } from '@/lib/api-client';
import type {
  UserLoginLogRow,
  UserLoginLogsResponse,
  TeacherActivityRow,
  UpcomingDeadlineRow,
  OversightScope
} from '../types';

function basePath(scope: OversightScope) {
  return scope === 'dean' ? '/dean/reports' : '/admin/reports';
}

export const fetchUserLoginLogs = (
  scope: OversightScope,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    facultyId?: number | null;
    from?: string | null;
    to?: string | null;
  } = {}
) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (scope === 'admin' && params.facultyId) qs.set('facultyId', String(params.facultyId));
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const query = qs.toString();
  return apiClient<UserLoginLogsResponse>(`${basePath(scope)}/user-logins${query ? `?${query}` : ''}`);
};

export const fetchTeacherActivity = (
  scope: OversightScope,
  params: { search?: string; facultyId?: number | null; departmentId?: number | null } = {}
) => {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (scope === 'admin' && params.facultyId) qs.set('facultyId', String(params.facultyId));
  if (params.departmentId) qs.set('departmentId', String(params.departmentId));
  const query = qs.toString();
  return apiClient<{ results: TeacherActivityRow[] }>(
    `${basePath(scope)}/teacher-activity${query ? `?${query}` : ''}`
  );
};

export const fetchUpcomingDeadlines = (
  scope: OversightScope,
  params: { days?: number; facultyId?: number | null } = {}
) => {
  const qs = new URLSearchParams();
  if (params.days) qs.set('days', String(params.days));
  if (scope === 'admin' && params.facultyId) qs.set('facultyId', String(params.facultyId));
  const query = qs.toString();
  return apiClient<{ results: UpcomingDeadlineRow[] }>(
    `${basePath(scope)}/upcoming-deadlines${query ? `?${query}` : ''}`
  );
};

// Entity-scoped reports (course / teacher / student / batch / faculty).
export { useReport, useReportSubjects, entityReportKeys } from './entity-reports';
export { useReportList, type ReportListResponse } from './entity-reports';
