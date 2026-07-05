import { useQuery } from '@/lib/async-query';
import {
  adminApi,
  type AdminAnalyticsFilters,
  type AdminAuditLogFilters,
} from './admin-api';

export const adminKeys = {
  all: ['admin'] as const,
  analytics: (filters: AdminAnalyticsFilters) =>
    [
      ...adminKeys.all,
      'analytics',
      'v2',
      filters.facultyId ?? 'all',
      filters.period ?? '6m',
    ] as const,
  faculties: () => [...adminKeys.all, 'faculties'] as const,
  auditLogs: (filters: AdminAuditLogFilters) =>
    [
      ...adminKeys.all,
      'audit-logs',
      filters.source ?? 'all',
      filters.module ?? 'all',
      filters.actionType ?? 'all',
      filters.severity ?? 'all',
      filters.status ?? 'all',
      filters.page ?? 1,
      filters.pageSize ?? 25,
      filters.dateFrom ?? '',
      filters.dateTo ?? '',
      filters.search ?? '',
      filters.actorId ?? 'all',
    ] as const,
  auditStats: () => [...adminKeys.all, 'audit-stats'] as const,
  auditActors: () => [...adminKeys.all, 'audit-actors'] as const,
};

export const useAdminAnalytics = (filters: AdminAnalyticsFilters = {}) =>
  useQuery({
    queryKey: adminKeys.analytics(filters),
    queryFn: () => adminApi.getAnalytics(filters),
    staleTime: 60_000,
  });

export const useAdminFaculties = () =>
  useQuery({
    queryKey: adminKeys.faculties(),
    queryFn: () => adminApi.getFaculties(),
    staleTime: 300_000,
  });

export const useAdminAuditLogs = (filters: AdminAuditLogFilters) =>
  useQuery({
    queryKey: adminKeys.auditLogs(filters),
    queryFn: () => adminApi.getAuditLogs(filters),
    staleTime: 30_000,
  });

export const useAdminAuditStats = () =>
  useQuery({
    queryKey: adminKeys.auditStats(),
    queryFn: () => adminApi.getAuditStats(),
    staleTime: 60_000,
  });

export const useAdminAuditActors = () =>
  useQuery({
    queryKey: adminKeys.auditActors(),
    queryFn: () => adminApi.getAuditActors(),
    staleTime: 120_000,
  });
