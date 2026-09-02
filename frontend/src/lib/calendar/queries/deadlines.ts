'use client';

import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import type { DeadlineRow } from '@/components/calendar/lib';

export const calendarDeadlineKeys = {
  range: (fromIso: string, toIso: string) =>
    ['calendar', 'deadlines', fromIso, toIso] as const,
};

export function fetchCalendarDeadlines(fromIso: string, toIso: string) {
  return apiClient<{ results: DeadlineRow[] }>(
    `/announcements/calendar-deadlines?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
  );
}

export function useCalendarDeadlines(
  fromIso: string,
  toIso: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: calendarDeadlineKeys.range(fromIso, toIso),
    queryFn: () => fetchCalendarDeadlines(fromIso, toIso),
    enabled: Boolean(options?.enabled ?? (fromIso && toIso)),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
