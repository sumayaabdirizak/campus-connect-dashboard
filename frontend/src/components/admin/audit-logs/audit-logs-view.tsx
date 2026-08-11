'use client';

import { Input } from '@/features/ui/components/input';
import { AuditLogDetailSheet } from '@/components/admin/audit-logs/audit-log-detail-sheet';
import { AuditLogsFiltersBar } from './audit-logs-filters-bar';
import { AuditLogsPagination } from './audit-logs-pagination';
import { AuditLogsTable } from './audit-logs-table';
import { AuditLogsToolbar } from './audit-logs-toolbar';
import { AuditModuleTabNav } from './audit-module-tabs';
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
    <div className='grid h-[calc(100dvh-var(--header-height)-0.5rem)] max-h-[calc(100dvh-var(--header-height)-0.5rem)] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5 overflow-hidden md:h-[calc(100dvh-var(--header-height)-0.75rem)] md:max-h-[calc(100dvh-var(--header-height)-0.75rem)]'>
      <AuditLogsToolbar
        stats={v.stats}
        statsLoading={v.statsLoading}
        isLoading={v.isLoading}
        showAdvanced={v.showAdvanced}
        selectedCount={v.selected.size}
        exportRows={v.exportRows}
        onRefresh={v.refreshAll}
        onToggleAdvanced={() => v.setShowAdvanced((s) => !s)}
      />

      <div className='flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm'>
        {v.showAdvanced || v.hasActiveFilters ? (
          <AuditLogsFiltersBar
            draft={v.draft}
            setDraft={v.setDraft}
            actors={v.actors}
            hasActiveFilters={v.hasActiveFilters}
            onApply={v.applyFilters}
            onReset={v.resetFilters}
          />
        ) : null}

        <div className='flex shrink-0 items-center gap-2 border-b px-3'>
          <div className='min-w-0 flex-1'>
            <AuditModuleTabNav active={v.filters.module} onChange={v.handleModuleTab} />
          </div>
          {!v.showAdvanced && !v.hasActiveFilters ? (
            <Input
              value={v.draft.search}
              onChange={(e) => v.setDraft({ ...v.draft, search: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') v.applyFilters();
              }}
              placeholder='Quick search…'
              className='h-8 w-40 shrink-0 sm:w-52'
            />
          ) : null}
        </div>

        {v.error ? (
          <div className='shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {v.error.message}
          </div>
        ) : null}

        <div className='relative min-h-0 flex-1 overflow-hidden'>
          <AuditLogsTable
            rows={v.rows}
            isLoading={v.isLoading}
            selected={v.selected}
            allSelected={v.allSelected}
            showModuleColumn={v.showModuleColumn}
            emptyHint={emptyHint}
            onToggleAll={v.toggleAll}
            onToggleRow={v.toggleRow}
            onView={v.setDetailEntry}
            onCopyId={v.copyLogId}
          />
        </div>

        <AuditLogsPagination
          selectedCount={v.selected.size}
          total={v.total}
          showingFrom={v.showingFrom}
          showingTo={v.showingTo}
          page={v.page}
          pageCount={v.pageCount}
          pageSize={v.pageSize}
          onPageSize={(size) => v.setFilters({ ...v.filters, pageSize: size, page: 1 })}
          onPrev={() => v.setFilters({ ...v.filters, page: v.page - 1 })}
          onNext={() => v.setFilters({ ...v.filters, page: v.page + 1 })}
        />
      </div>

      <AuditLogDetailSheet
        entry={v.detailEntry}
        open={v.detailEntry != null}
        onOpenChange={(open) => !open && v.setDetailEntry(null)}
      />
    </div>
  );
}
