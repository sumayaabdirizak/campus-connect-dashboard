'use client';

import {
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  downloadAuditCsv,
  downloadAuditExcel,
  printAuditPdf,
} from '@/features/admin/components/audit-logs/export-audit-logs';
import type { PlatformAuditLogEntry } from '@/features/admin/api/admin-api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { StatChip } from './audit-stat-chip';

interface AuditLogsToolbarProps {
  stats: {
    totalEvents: number;
    todayActivities: number;
    failedActions: number;
    criticalEvents: number;
    activeUsersToday: number;
  } | null | undefined;
  statsLoading: boolean;
  isLoading: boolean;
  showAdvanced: boolean;
  selectedCount: number;
  exportRows: PlatformAuditLogEntry[];
  onRefresh: () => void;
  onToggleAdvanced: () => void;
}

export function AuditLogsToolbar({
  stats,
  statsLoading,
  isLoading,
  showAdvanced,
  selectedCount,
  exportRows,
  onRefresh,
  onToggleAdvanced,
}: AuditLogsToolbarProps) {
  return (
    <div className='flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2'>
      <h1 className='text-lg font-semibold tracking-tight sm:text-xl'>Audit Logs</h1>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <StatChip label='total' value={stats?.totalEvents ?? 0} loading={statsLoading} />
        <StatChip label='today' value={stats?.todayActivities ?? 0} loading={statsLoading} />
        <StatChip label='failed' value={stats?.failedActions ?? 0} loading={statsLoading} />
        <StatChip label='critical' value={stats?.criticalEvents ?? 0} loading={statsLoading} />
        <StatChip
          label='active users'
          value={stats?.activeUsersToday ?? 0}
          loading={statsLoading}
        />
      </div>
      <div className='flex flex-wrap items-center gap-1.5'>
        <Button type='button' variant='outline' size='sm' onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('mr-1.5 size-3.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type='button' variant='outline' size='sm'>
              <Download className='mr-1.5 size-3.5' />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52'>
            <DropdownMenuLabel>Export scope</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => downloadAuditCsv(exportRows)}>
              <FileText className='mr-2 size-4' />
              {selectedCount ? 'Selected rows (CSV)' : 'Current page (CSV)'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadAuditExcel(exportRows)}>
              <FileSpreadsheet className='mr-2 size-4' />
              {selectedCount ? 'Selected rows (Excel)' : 'Current page (Excel)'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printAuditPdf(exportRows)}>
              <FileText className='mr-2 size-4' />
              Print / PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type='button'
          variant={showAdvanced ? 'default' : 'secondary'}
          size='sm'
          onClick={onToggleAdvanced}
        >
          <Search className='mr-1.5 size-3.5' />
          Filters
        </Button>
      </div>
    </div>
  );
}
