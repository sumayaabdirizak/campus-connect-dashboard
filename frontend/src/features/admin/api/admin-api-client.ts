import { apiClient } from '@/lib/api-client';
import type {
  AdminAnalyticsFilters,
  AdminAuditLogFilters,
  AdminFaculty,
  AuditActorOption,
  PlatformAnalytics,
  PlatformAuditLogsResponse,
  PlatformAuditStats,
} from './admin-api-types';
import { normalizePlatformAnalytics } from './normalize-platform-analytics';

const BASE = '/admin';

export const adminApi = {
  getAnalytics: async (filters: AdminAnalyticsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.facultyId != null) {
      params.set('facultyId', String(filters.facultyId));
    }
    if (filters.period) {
      params.set('period', filters.period);
    }
    const qs = params.toString();
    const result = await apiClient<PlatformAnalytics>(`${BASE}/analytics${qs ? `?${qs}` : ''}`);
    return normalizePlatformAnalytics(result)!;
  },
  getFaculties: () => apiClient<{ results: AdminFaculty[] }>(`${BASE}/faculties`),
  getAuditLogs: (filters: AdminAuditLogFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.source && filters.source !== 'all') params.set('source', filters.source);
    if (filters.module && filters.module !== 'all') params.set('module', filters.module);
    if (filters.actionType && filters.actionType !== 'all') params.set('actionType', filters.actionType);
    if (filters.severity && filters.severity !== 'all') params.set('severity', filters.severity);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.page != null) params.set('page', String(filters.page));
    if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.search) params.set('search', filters.search);
    if (filters.actorId != null) params.set('actorId', String(filters.actorId));
    const qs = params.toString();
    return apiClient<PlatformAuditLogsResponse>(`${BASE}/audit-logs${qs ? `?${qs}` : ''}`);
  },
  getAuditStats: () => apiClient<PlatformAuditStats>(`${BASE}/audit-logs/stats`),
  getAuditActors: () => apiClient<{ results: AuditActorOption[] }>(`${BASE}/audit-logs/actors`),
};
