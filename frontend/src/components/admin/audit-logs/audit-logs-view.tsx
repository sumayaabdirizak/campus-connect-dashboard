'use client';

import { Download, FileSpreadsheet, FileText, Search } from 'lucide-react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/ui/components/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs';
import { AuditLogDetailSheet } from '@/components/admin/audit-logs/audit-log-detail-sheet';
import {
  downloadAuditCsv,
  downloadAuditExcel,
  printAuditPdf,
} from '@/components/admin/audit-logs/export-audit-logs';
import { AuditLogsAdminTable } from './audit-logs-admin-table';
import { AuditLogsFiltersBar } from './audit-logs-filters-bar';
import { StatChip } from './audit-stat-chip';
import { AUDIT_MODULE_TABS } from './audit-module-tabs';
import { useAuditLogsView } from './use-audit-logs-view';

export type { AuditLogFilterState } from './audit-filters';
export { auditFiltersToQuery } from './audit-filters';

export function AuditLogsView() {
  const v = useAuditLogsView();

  const emptyHint =
    v.filters.module === 'all'
      ? 'System activities will appear here once users start interacting with the platform.'
      : `No ${v.activeModuleLabel.toLowerCase()} events match your current filters.`;

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Audit Logs'
        onRefresh={v.refreshAll}
        refreshing={v.isLoading}
        showFullscreen
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className='h-9 flex-1 gap-1.5 rounded-full px-4 sm:flex-none'
            >
              <Download className='size-4' />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52'>
            <DropdownMenuLabel>Export scope</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => downloadAuditCsv(v.exportRows)}>
              <FileText className='mr-2 size-4' />
              {v.selected.size ? 'Selected rows (CSV)' : 'Current page (CSV)'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadAuditExcel(v.exportRows)}>
              <FileSpreadsheet className='mr-2 size-4' />
              {v.selected.size ? 'Selected rows (Excel)' : 'Current page (Excel)'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printAuditPdf(v.exportRows)}>
              <FileText className='mr-2 size-4' />
              Print / PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type='button'
          variant={v.showAdvanced ? 'default' : 'outline'}
          className='h-9 flex-1 gap-1.5 rounded-full px-4 sm:flex-none'
          onClick={() => v.setShowAdvanced((s) => !s)}
        >
          <Search className='size-4' />
          Filters
        </Button>
      </PosPageHeader>

      <div className='text-muted-foreground mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm'>
        <StatChip label='total' value={v.stats?.totalEvents ?? 0} loading={v.statsLoading} />
        <StatChip label='today' value={v.stats?.todayActivities ?? 0} loading={v.statsLoading} />
        <StatChip label='failed' value={v.stats?.failedActions ?? 0} loading={v.statsLoading} />
        <StatChip label='critical' value={v.stats?.criticalEvents ?? 0} loading={v.statsLoading} />
        <StatChip
          label='active users'
          value={v.stats?.activeUsersToday ?? 0}
          loading={v.statsLoading}
        />
      </div>

      <Tabs
        value={v.filters.module}
        onValueChange={(value) => v.handleModuleTab(value as typeof v.filters.module)}
        className='gap-3'
      >
        <TabsList className='h-10 w-full max-w-full justify-start overflow-x-auto rounded-full bg-muted/80 p-1 sm:w-auto'>
          {AUDIT_MODULE_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className='rounded-full px-4'>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={v.filters.module} className='mt-0'>
          {v.showAdvanced || v.hasActiveFilters ? (
            <div className='mb-3'>
              <AuditLogsFiltersBar
                draft={v.draft}
                setDraft={v.setDraft}
                actors={v.actors}
                hasActiveFilters={v.hasActiveFilters}
                onApply={v.applyFilters}
                onReset={v.resetFilters}
              />
            </div>
          ) : null}

          {v.error ? (
            <div className='mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
              {v.error.message}
            </div>
          ) : null}

          <AuditLogsAdminTable
            rows={v.rows}
            isLoading={v.isLoading}
            selected={v.selected}
            allSelected={v.allSelected}
            showModuleColumn={v.showModuleColumn}
            emptyHint={emptyHint}
            search={v.search}
            onSearchChange={v.setSearch}
            visibleCols={v.visibleCols}
            onVisibleColsChange={v.setVisibleCols}
            total={v.total}
            page={v.page}
            pageSize={v.pageSize}
            onPageChange={(page) => v.setFilters({ ...v.filters, page })}
            onPageSizeChange={(pageSize) => v.setFilters({ ...v.filters, pageSize, page: 1 })}
            onToggleAll={v.toggleAll}
            onToggleRow={v.toggleRow}
            onView={v.setDetailEntry}
            onCopyId={v.copyLogId}
          />
        </TabsContent>
      </Tabs>

      <AuditLogDetailSheet
        entry={v.detailEntry}
        open={v.detailEntry != null}
        onOpenChange={(open) => !open && v.setDetailEntry(null)}
      />
    </PageContainer>
  );
}
