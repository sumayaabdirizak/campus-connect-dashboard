import { queryOptions, useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  getSessions,
  createSession,
  deleteSession,
  getRecords,
  createRecord,
  updateRecord,
  getAttendanceStats,
  getAttendanceSummary
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
  stats: (courseOfferingId: string) => [...attendanceKeys.all, 'stats', courseOfferingId] as const,
  summary: (courseOfferingId: string) =>
    [...attendanceKeys.all, 'summary', courseOfferingId] as const
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

export const attendanceSummaryQueryOptions = (courseOfferingId: string) =>
  queryOptions({
    queryKey: attendanceKeys.summary(courseOfferingId),
    queryFn: () => getAttendanceSummary(courseOfferingId)
  });

export function useAttendanceSummary(courseOfferingId: string) {
  return useQuery(attendanceSummaryQueryOptions(courseOfferingId));
}

export function useSessions(courseOfferingId: string) {
  return useQuery(sessionsQueryOptions(courseOfferingId));
}

export function useRecords(courseOfferingId: string, filters?: AttendanceFilters) {
  return useQuery(recordsQueryOptions(courseOfferingId, filters));
}

function invalidateAttendance(queryClient: ReturnType<typeof useQueryClient>, courseOfferingId: string) {
  queryClient.invalidateQueries({ queryKey: attendanceKeys.sessions(courseOfferingId) });
  queryClient.invalidateQueries({ queryKey: attendanceKeys.summary(courseOfferingId) });
  queryClient.invalidateQueries({
    queryKey: [...attendanceKeys.all, 'records', courseOfferingId]
  });
}

export function useCreateSession(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionData) => createSession(courseOfferingId, data),
    onSuccess: () => invalidateAttendance(queryClient, courseOfferingId)
  });
}

export function useDeleteSession(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => deleteSession(courseOfferingId, scheduleId),
    onSuccess: () => invalidateAttendance(queryClient, courseOfferingId)
  });
}

export function useUpsertRecord(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { recordId?: number; create?: CreateRecordData; update?: UpdateRecordData }) => {
      if (input.recordId && input.update) {
        return updateRecord(courseOfferingId, String(input.recordId), input.update);
      }
      if (input.create) {
        return createRecord(courseOfferingId, input.create);
      }
      throw new Error('useUpsertRecord: provide recordId+update or create');
    },
    onSuccess: () => invalidateAttendance(queryClient, courseOfferingId)
  });
}

export { createSession, createRecord, updateRecord };
