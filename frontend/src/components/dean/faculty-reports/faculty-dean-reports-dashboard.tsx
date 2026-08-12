'use client';

import { FacultyReportsFilters } from './faculty-reports-filters';
import { FacultyDeanReportsActivity } from './faculty-dean-reports-activity';
import { FacultyDeanReportsAnalyticsCharts } from './faculty-dean-reports-analytics-charts';
import { FacultyDeanReportsHeader } from './faculty-dean-reports-header';
import { FacultyDeanReportsPerformance } from './faculty-dean-reports-performance';
import { FacultyDeanReportsRiskPanel } from './faculty-dean-reports-risk-panel';
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
      <FacultyDeanReportsPerformance data={data} />

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
        <FacultyDeanReportsRiskPanel data={data} />
        <FacultyDeanReportsActivity data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}
