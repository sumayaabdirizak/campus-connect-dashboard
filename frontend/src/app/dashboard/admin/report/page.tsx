'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { useAdminAnalytics, useAdminFaculties } from '@/features/admin/api/queries';
import {
  AdminReportFilters,
  type AdminReportFilterState,
} from '@/features/admin/components/admin-report-filters';
import { AdminReportsDashboard } from '@/features/admin/components/admin-reports/admin-reports-dashboard';

export default function AdminReportPage() {
  const [filters, setFilters] = useState<AdminReportFilterState>({
    facultyId: null,
    period: '6m',
  });

  const { data: facultiesData, isLoading: facultiesLoading } = useAdminFaculties();
  const { data, isLoading, error, refetch } = useAdminAnalytics({
    facultyId: filters.facultyId,
    period: filters.period,
  });

  return (
    <PageContainer scrollable>
      <AdminReportsDashboard
        data={data}
        isLoading={isLoading && !data}
        isRefreshing={isLoading && !!data}
        error={error?.message}
        filters={filters}
        onFiltersChange={setFilters}
        faculties={facultiesData?.results ?? []}
        facultiesLoading={facultiesLoading}
        onRefresh={() => void refetch()}
      />
    </PageContainer>
  );
}
