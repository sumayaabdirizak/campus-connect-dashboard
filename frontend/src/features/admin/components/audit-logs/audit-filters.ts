import type {
  AdminAuditLogFilters,
  AuditActionType,
  AuditModule,
  AuditSeverity,
  AuditStatus,
} from '@/features/admin/api/admin-api';

export interface AuditLogFilterState {
  search: string;
  actorId: number | null;
  actionType: AuditActionType;
  module: AuditModule;
  severity: AuditSeverity;
  status: AuditStatus;
  period: '7d' | '30d' | '90d' | 'all';
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: AuditLogFilterState = {
  search: '',
  actorId: null,
  actionType: 'all',
  module: 'all',
  severity: 'all',
  status: 'all',
  period: '30d',
  page: 1,
  pageSize: 25,
};

function periodToDateRange(period: AuditLogFilterState['period']) {
  if (period === 'all') return { dateFrom: null, dateTo: null };
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { dateFrom: from.toISOString(), dateTo: null };
}

export function auditFiltersToQuery(state: AuditLogFilterState): AdminAuditLogFilters {
  const { dateFrom, dateTo } = periodToDateRange(state.period);
  return {
    module: state.module,
    actionType: state.actionType,
    severity: state.severity,
    status: state.status,
    page: state.page,
    pageSize: state.pageSize,
    dateFrom,
    dateTo,
    search: state.search.trim() || null,
    actorId: state.actorId,
  };
}

export function hasActiveAuditFilters(filters: AuditLogFilterState) {
  return Boolean(
    filters.search ||
      filters.actorId != null ||
      filters.actionType !== 'all' ||
      filters.module !== 'all' ||
      filters.severity !== 'all' ||
      filters.status !== 'all' ||
      filters.period !== '30d'
  );
}
