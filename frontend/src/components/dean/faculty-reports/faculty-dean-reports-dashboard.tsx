'use client';

import dynamic from 'next/dynamic';
import { FacultyReportsFilters } from './faculty-reports-filters';
import { FacultyDeanReportsActivity } from './faculty-dean-reports-activity';
import { FacultyDeanReportsHeader } from './faculty-dean-reports-header';
import { FacultyDeanReportsRiskPanel } from './faculty-dean-reports-risk-panel';

/** recharts in its own chunk, as on the admin and main dashboards. */
const chartLoading = () => (
  <div className='h-64 animate-pulse rounded-xl border bg-card' aria-hidden />
);

const FacultyDeanReportsAnalyticsCharts = dynamic(
  () =>
    import('./faculty-dean-reports-analytics-charts').then(
      (m) => m.FacultyDeanReportsAnalyticsCharts
    ),
  { ssr: false, loading: chartLoading }
);
const FacultyDeanReportsPerformance = dynamic(
  () =>
    import('./faculty-dean-reports-performance').then((m) => m.FacultyDeanReportsPerformance),
  { ssr: false, loading: chartLoading }
);
const FacultyDeanReportsTopStudents = dynamic(
  () =>
    import('./faculty-dean-reports-top-students').then((m) => m.FacultyDeanReportsTopStudents),
  { ssr: false, loading: chartLoading }
);
const FacultyDeanReportsTopDepartments = dynamic(
  () =>
    import('./faculty-dean-reports-top-departments').then(
      (m) => m.FacultyDeanReportsTopDepartments
    ),
  { ssr: false, loading: chartLoading }
);
import type { FacultyDeanReportsDashboardProps } from './faculty-dean-reports-types';

export type { FacultyDeanReportsDashboardProps } from './faculty-dean-reports-types';

export function FacultyDeanReportsDashboard({
  data,
  isLoading,
  isRefreshing,
  error,
  filters,
  onFiltersChange,
  onRefresh,
}: FacultyDeanReportsDashboardProps) {
  return (
    <div className='space-y-4 pb-6'>
      <FacultyDeanReportsHeader data={data} isRefreshing={isRefreshing} onRefresh={onRefresh} />

      {error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          {error}
        </div>
      ) : null}

      <FacultyReportsFilters
        filters={filters}
        onChange={onFiltersChange}
        departments={data?.filterOptions.departments ?? []}
        sticky
      />

      <FacultyDeanReportsAnalyticsCharts data={data} />

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
        <FacultyDeanReportsPerformance data={data} />
        <FacultyDeanReportsTopStudents data={data} />
        <FacultyDeanReportsTopDepartments data={data} />
      </div>

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
        <FacultyDeanReportsRiskPanel data={data} />
        <FacultyDeanReportsActivity data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}
