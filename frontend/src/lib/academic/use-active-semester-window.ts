'use client';

import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';

export type ActiveSemesterWindow = {
  label: string;
  semesterId: number | null;
  academicYearId: number | null;
  startDate: string | null;
  endDate: string | null;
  minDate: string | null;
  maxDate: string | null;
  monthsCount: number;
};

export async function fetchActiveSemesterWindow(
  facultyId?: number | null
): Promise<ActiveSemesterWindow> {
  const qs =
    facultyId != null && Number.isFinite(facultyId)
      ? `?facultyId=${facultyId}`
      : '';
  return apiClient<ActiveSemesterWindow>(
    `/academic-years/active-semester-window${qs}`
  );
}

export function useActiveSemesterWindow(facultyId?: number | null) {
  return useQuery({
    queryKey: ['active-semester-window', facultyId ?? 'default'],
    queryFn: () => fetchActiveSemesterWindow(facultyId),
    staleTime: 60_000,
  });
}
