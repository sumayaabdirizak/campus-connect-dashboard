'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { PlatformAnalytics } from '@/lib/admin/services'
import {
  AdminReportFilters,
  type AdminReportFilterState,
} from '@/components/admin/admin-report-filters'
import { buildReportCatalog } from '@/components/admin/admin-reports/export-reports'
import { ReportsCharts } from './reports-charts'
import { ReportsHeader } from './reports-header'
import { ReportsKpiGrid } from './reports-kpi-grid'
import { Skeleton } from '@/features/ui/components/skeleton'

const ReportsActivity = dynamic(
  () => import('./reports-activity').then((m) => m.ReportsActivity),
  {
    ssr: false,
    loading: () => <Skeleton className='h-48 rounded-xl' />,
  }
)

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

      <AdminReportFilters
        faculties={faculties}
        value={filters}
        onChange={onFiltersChange}
        loadingFaculties={facultiesLoading}
        disabled={isLoading}
        sticky
      />

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
