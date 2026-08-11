'use client';

import { useMemo, useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { FacultyDeanReportsDashboard } from '@/components/dean/faculty-reports/faculty-dean-reports-dashboard';
import {
  defaultFacultyReportFilters,
  type FacultyReportFilterState,
} from '@/components/dean/faculty-reports/faculty-reports-filters';
import { useDeanReports } from '@/lib/dean/queries';

export default function FacultyDeanReportsPage() {
  const [filters, setFilters] = useState<FacultyReportFilterState>(defaultFacultyReportFilters);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { period: filters.period || '6m' };
    if ((filters.departmentId || 'all') !== 'all') params.departmentId = filters.departmentId || '';
    if ((filters.studentLevel || 'all') !== 'all') params.studentLevel = filters.studentLevel || '';
    if ((filters.status || 'all') !== 'all') params.status = filters.status || '';
    return params;
  }, [filters.period, filters.departmentId, filters.studentLevel, filters.status]);

  const { data, isLoading, error, refetch, isFetching } = useDeanReports(queryParams);

  return (
    <PageContainer fill>
      <div className='flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto p-3 md:p-4'>
        <PosPageHeader
          title='Reports'
          onRefresh={() => void refetch()}
          refreshing={isFetching}
          showFullscreen={false}
        />
        <FacultyDeanReportsDashboard
          data={data}
          isLoading={isLoading && !data}
          isRefreshing={isFetching && !!data}
          error={error?.message}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={() => void refetch()}
        />
      </div>
    </PageContainer>
  );
}

