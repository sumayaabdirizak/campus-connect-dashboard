export type {
  AdminReportPeriod,
  AdminAnalyticsFilters,
  PlatformAnalytics,
  AdminFaculty,
  AdminAuditSource,
  AuditActionType,
  AuditSeverity,
  AuditStatus,
  AuditModule,
  AdminAuditLogFilters,
  PlatformAuditLogEntry,
  PlatformAuditLogsResponse,
  PlatformAuditStats,
  AuditActorOption,
} from './admin-api-types';

export { normalizePlatformAnalytics } from './normalize-platform-analytics';
export { adminApi } from './admin-api-client';
