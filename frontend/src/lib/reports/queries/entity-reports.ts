'use client';

import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import type { Report, ReportScope, ReportSubjectOption } from '../types';

export type ReportWindowParams = {
  from?: string | null;
  to?: string | null;
  status?: string | null;
};

export const entityReportKeys = {
  all: ['reports', 'entity'] as const,
  subjects: (scope: ReportScope) => [...entityReportKeys.all, 'subjects', scope] as const,
  detail: (
    scope: ReportScope,
    id: string,
    period: string,
    window: ReportWindowParams
  ) =>
    [...entityReportKeys.all, 'detail', scope, id, period, window.from, window.to] as const
};

function appendWindowParams(query: URLSearchParams, window: ReportWindowParams) {
  if (window.from) query.set('from', window.from);
  if (window.to) query.set('to', window.to);
  if (window.status && window.status !== 'all') query.set('status', window.status);
}

export function useReportSubjects(scope: ReportScope) {
  return useQuery({
    queryKey: entityReportKeys.subjects(scope),
    queryFn: () =>
      apiClient<{ scope: ReportScope; subjects: ReportSubjectOption[] }>(
        `/reports/${scope}/subjects`
      ),
    staleTime: 5 * 60_000
  });
}

export function useReport(
  scope: ReportScope,
  id: string | null,
  period: string,
  window: ReportWindowParams = {}
) {
  return useQuery({
    queryKey: entityReportKeys.detail(scope, id ?? '', period, window),
    queryFn: () => {
      const query = new URLSearchParams({
        id: id ?? '',
        period
      });
      appendWindowParams(query, window);
      return apiClient<Report>(`/reports/${scope}?${query.toString()}`);
    },
    enabled: !!id
  });
}

export interface ReportListResponse {
  scope: ReportScope;
  period: { months: number; since: string | null; until?: string | null };
  rows: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
  totalUnfiltered: number;
}

export interface ReportListParams {
  page: number;
  pageSize: number;
  search: string;
  sort: string | null;
  dir: 'asc' | 'desc';
  from?: string | null;
  to?: string | null;
  status?: string | null;
}

export function useReportList(
  scope: ReportScope,
  period: string,
  params: ReportListParams
) {
  const trimmedSearch = params.search.trim();
  const window = {
    from: params.from ?? null,
    to: params.to ?? null,
    status: params.status ?? null
  };

  return useQuery({
    queryKey: [
      ...entityReportKeys.all,
      'list',
      scope,
      period,
      window.from,
      window.to,
      window.status,
      params.page,
      params.pageSize,
      trimmedSearch,
      params.sort,
      params.dir
    ],
    queryFn: () => fetchReportList(scope, period, params)
  });
}

export function fetchReportList(
  scope: ReportScope,
  period: string,
  params: ReportListParams
) {
  const trimmedSearch = params.search.trim();
  const query = new URLSearchParams({
    period,
    page: String(params.page),
    pageSize: String(params.pageSize),
    dir: params.dir
  });
  if (trimmedSearch) query.set('search', trimmedSearch);
  if (params.sort) query.set('sort', params.sort);
  appendWindowParams(query, {
    from: params.from,
    to: params.to,
    status: params.status
  });

  return apiClient<ReportListResponse>(`/reports/${scope}/list?${query.toString()}`);
}
