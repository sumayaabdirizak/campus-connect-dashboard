'use client'

import { Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'
import type { PlatformAnalytics } from '@/lib/admin/services'
import { formatReportScopeSummary } from '@/components/admin/admin-report-filters'
import {
  downloadReportsCsv,
  printPlatformAnalyticsPdf,
  type ReportCatalogItem,
} from '@/components/admin/admin-reports/export-reports'
import { Button } from '@/features/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/ui/components/dropdown-menu'
import { cn } from '@/lib/utils'

type Props = {
  data?: PlatformAnalytics
  catalog: ReportCatalogItem[]
  isRefreshing?: boolean
  onRefresh: () => void
}

export function ReportsHeader({ data, catalog, isRefreshing, onRefresh }: Props) {
  const exportPdfSummary = () => {
    if (!data) return
    printPlatformAnalyticsPdf(data, catalog)
  }

  return (
    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Platform analytics</h1>
        <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
          Cross-faculty LMS usage, registrations, and assessment activity. For per-entity drill-down,
          use LMS activity reports in the sidebar.
        </p>
        {data ? (
          <p className='text-muted-foreground mt-1 text-xs'>{formatReportScopeSummary(data.scope)}</p>
        ) : null}
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={onRefresh}>
          <RefreshCw className={cn('mr-1.5 size-3.5', isRefreshing && 'animate-spin')} />
          Refresh data
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type='button' variant='outline' size='sm'>
              <Download className='mr-1.5 size-3.5' />
              Export reports
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Export center</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => downloadReportsCsv(catalog)}>
              <FileText className='mr-2 size-4' /> CSV — catalog
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadReportsCsv(catalog)}>
              <FileSpreadsheet className='mr-2 size-4' /> Excel — catalog
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPdfSummary} disabled={!data}>
              <FileText className='mr-2 size-4' /> PDF — full report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
