'use client'

import { Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'
import type { PlatformAnalytics } from '@/features/admin/api/admin-api'
import { formatReportScopeSummary } from '@/features/admin/components/admin-report-filters'
import {
  downloadReportsCsv,
  printReportsPdf,
  type ReportCatalogItem,
} from '@/features/admin/components/admin-reports/export-reports'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    const rows = catalog
      .map(
        (r) =>
          `<tr><td>${r.name}</td><td>${r.category}</td><td>${r.status}</td><td>${data.scope.periodLabel}</td></tr>`
      )
      .join('')
    printReportsPdf(
      'Reports & Analytics',
      `<table><thead><tr><th>Report</th><th>Category</th><th>Status</th><th>Period</th></tr></thead><tbody>${rows}</tbody></table>`
    )
  }

  return (
    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Reports & Analytics</h1>
        <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
          Monitor platform performance, user engagement, academic activities, and operational
          insights.
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
            <DropdownMenuItem onClick={exportPdfSummary}>
              <FileText className='mr-2 size-4' /> PDF — summary
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
