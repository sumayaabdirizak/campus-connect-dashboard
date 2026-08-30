'use client'

import { useMemo } from 'react'
import type { PlatformAnalytics } from '@/lib/admin/services'
import {
  AdminReportFilters,
  type AdminReportFilterState,
} from '@/components/admin/admin-report-filters'
import { buildReportCatalog } from '@/components/admin/admin-reports/export-reports'
import { ReportsActivity } from './reports-activity'
import { ReportsCharts } from './reports-charts'
import { ReportsHeader } from './reports-header'
import { ReportsKpiGrid } from './reports-kpi-grid'

interface AdminReportsDashboardProps {
  data?: PlatformAnalytics
  isLoading: boolean
  isRefreshing?: boolean
  error?: string
  filters: AdminReportFilterState
  onFiltersChange: (next: AdminReportFilterState) => void
  facultiesLoading?: boolean
  faculties: { id: number; name: string; code: string }[]
  onRefresh: () => void
}

export function AdminReportsDashboard({
  data,
  isLoading,
  isRefreshing,
  error,
  filters,
  onFiltersChange,
  facultiesLoading,
  faculties,
  onRefresh,
}: AdminReportsDashboardProps) {
  const catalog = useMemo(() => buildReportCatalog(data), [data])

  return (
    <div className='space-y-6 pb-8'>
      {isRefreshing ? (
        <div className='pointer-events-none fixed inset-x-0 top-[var(--header-height)] z-50 h-0.5 bg-muted'>
          <div className='h-full w-1/3 animate-pulse bg-primary' />
        </div>
      ) : null}

      <ReportsHeader
        data={data}
        catalog={catalog}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />
      <ReportsKpiGrid data={data} isLoading={isLoading} />

      <div className='rounded-xl border bg-card p-4'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <p className='text-sm font-semibold'>Global filters</p>
          <AdminReportFilters
            faculties={faculties}
            value={filters}
            onChange={onFiltersChange}
            loadingFaculties={facultiesLoading}
            disabled={isLoading}
          />
        </div>
        <p className='text-muted-foreground text-xs'>
          Faculty and period drive all charts. Additional filters refine the report catalog view.
        </p>
      </div>

      {error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          {error}
        </div>
      ) : null}

      <ReportsCharts data={data} isLoading={isLoading} />
      <ReportsActivity data={data} />
    </div>
  )
}
