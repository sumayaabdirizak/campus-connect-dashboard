'use client';

import { useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@/lib/async-query';
import { fetchAllFaculties } from '@/lib/faculties/faculty-list';
import { useFacultyDashboardReport } from '@/lib/dean/queries';
import { FacultyDeanReportsDashboard } from '@/components/dean/faculty-reports/faculty-dean-reports-dashboard';
import {
  defaultFacultyReportFilters,
  type FacultyReportFilterState,
} from '@/components/dean/faculty-reports/faculty-reports-filters';
import { SearchSelect } from '@/components/ui/search-select';

function buildParams(
  filters: FacultyReportFilterState,
  facultyId: number | null
): Record<string, string> {
  const params: Record<string, string> = { period: filters.period };
  if (filters.period === 'custom') {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  if (filters.departmentId !== 'all') params.departmentId = filters.departmentId;
  if (filters.batchId !== 'all') params.batchId = filters.batchId;
  if (filters.sectionId !== 'all') params.sectionId = filters.sectionId;
  if (filters.studentLevel !== 'all') params.studentLevel = filters.studentLevel;
  if (filters.status !== 'all') params.status = filters.status;
  if (facultyId != null) params.facultyId = String(facultyId);
  return params;
}

export function FacultyDashboardReportView() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [filters, setFilters] = useState<FacultyReportFilterState>(defaultFacultyReportFilters);
  const [facultyId, setFacultyId] = useState<number | null>(null);

  const { data: faculties } = useQuery({
    queryKey: ['faculties', 'all-for-report-picker'],
    queryFn: fetchAllFaculties,
    enabled: isSuperAdmin,
  });

  const params = useMemo(() => buildParams(filters, isSuperAdmin ? facultyId : null), [
    filters,
    facultyId,
    isSuperAdmin,
  ]);

  const enabled = !isSuperAdmin || facultyId != null;

  const { data, isLoading, isFetching, error, refetch } = useFacultyDashboardReport(
    params,
    enabled
  );

  return (
    <div className='space-y-4'>
      {isSuperAdmin ? (
        <div className='flex items-center gap-2 rounded-xl border bg-card p-3'>
          <span className='text-muted-foreground text-sm font-medium'>Faculty:</span>
          <SearchSelect
            value={facultyId ? String(facultyId) : ''}
            onValueChange={(val) => setFacultyId(val ? Number(val) : null)}
            options={(faculties ?? []).map((f) => ({ value: String(f.id), label: f.name }))}
            placeholder='Select a faculty to view its report'
            className='max-w-xs'
          />
        </div>
      ) : null}

      {!enabled ? (
        <div className='text-muted-foreground rounded-xl border bg-card p-6 text-center text-sm'>
          Select a faculty above to load its report.
        </div>
      ) : (
        <FacultyDeanReportsDashboard
          data={data}
          isLoading={isLoading}
          isRefreshing={isFetching}
          error={error?.message}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={() => void refetch()}
        />
      )}
    </div>
  );
}
