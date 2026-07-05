'use client';

import { useMemo, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { FacultyDeanReportsDashboard } from '@/features/dean/components/faculty-reports/faculty-dean-reports-dashboard';
import {
  defaultFacultyReportFilters,
  type FacultyReportFilterState,
} from '@/features/dean/components/faculty-reports/faculty-reports-filters';
import { useDeanReports } from '@/features/dean/api/queries';

export default function FacultyDeanReportsPage() {
  const [filters, setFilters] = useState<FacultyReportFilterState>(defaultFacultyReportFilters);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { period: filters.period };
    if (filters.departmentId !== 'all') params.departmentId = filters.departmentId;
    return params;
  }, [filters.period, filters.departmentId]);

  const { data, isLoading, error, refetch, isFetching } = useDeanReports(queryParams);

  return (
    <PageContainer scrollable>
      <FacultyDeanReportsDashboard
        data={data}
        isLoading={isLoading && !data}
        isRefreshing={isFetching && !!data}
        error={error?.message}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={() => void refetch()}
      />
    </PageContainer>
  );
}
