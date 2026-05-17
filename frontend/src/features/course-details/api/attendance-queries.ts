import { queryOptions } from '@/lib/async-query';
import {
  getSessions,
  createSession,
  deleteSession,
  getRecords,
  createRecord,
  updateRecord,
  getAttendanceStats
} from './attendance-service';
import {
  CreateSessionData,
  CreateRecordData,
  UpdateRecordData,
  AttendanceFilters
} from './attendance-types';

export const attendanceKeys = {
  all: ['attendance'] as const,
  sessions: (courseOfferingId: string) =>
    [...attendanceKeys.all, 'sessions', courseOfferingId] as const,
  records: (courseOfferingId: string, filters?: AttendanceFilters) =>
    [...attendanceKeys.all, 'records', courseOfferingId, filters] as const,
  stats: (courseOfferingId: string) => [...attendanceKeys.all, 'stats', courseOfferingId] as const
};

export const sessionsQueryOptions = (courseOfferingId: string) =>
  queryOptions({
    queryKey: attendanceKeys.sessions(courseOfferingId),
    queryFn: () => getSessions(courseOfferingId)
  });

export const recordsQueryOptions = (courseOfferingId: string, filters?: AttendanceFilters) =>
  queryOptions({
    queryKey: attendanceKeys.records(courseOfferingId, filters),
    queryFn: () => getRecords(courseOfferingId, filters)
  });

export const attendanceStatsQueryOptions = (courseOfferingId: string) =>
  queryOptions({
    queryKey: attendanceKeys.stats(courseOfferingId),
    queryFn: () => getAttendanceStats(courseOfferingId)
  });

export { createSession, createRecord, updateRecord };
