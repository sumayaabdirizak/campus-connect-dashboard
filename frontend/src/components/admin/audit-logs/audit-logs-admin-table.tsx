'use client';

import { AlertTriangle } from 'lucide-react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell,
} from '@/features/pos/components/pos-table';
import { Checkbox } from '@/features/ui/components/checkbox';
import { Skeleton } from '@/features/ui/components/skeleton';
import type { PlatformAuditLogEntry } from '@/lib/admin/services';
import { AuditLogRow } from './audit-log-row';
import { AUDIT_COLUMN_OPTS, type AuditColumnId } from './audit-table-utils';

interface AuditLogsAdminTableProps {
  rows: PlatformAuditLogEntry[];
  isLoading: boolean;
  selected: Set<string>;
  allSelected: boolean;
  showModuleColumn: boolean;
  emptyHint: string;
  search: string;
  onSearchChange: (value: string) => void;
  visibleCols: AuditColumnId[];
  onVisibleColsChange: (ids: AuditColumnId[]) => void;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onView: (entry: PlatformAuditLogEntry) => void;
  onCopyId: (id: string) => void;
}

export function AuditLogsAdminTable({
  rows,
  isLoading,
  selected,
  allSelected,
  showModuleColumn,
  emptyHint,
  search,
  onSearchChange,
  visibleCols,
  onVisibleColsChange,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onToggleAll,
  onToggleRow,
  onView,
  onCopyId,
}: AuditLogsAdminTableProps) {
  const col = (id: AuditColumnId) => visibleCols.includes(id);
  const showModule = showModuleColumn && col('module');

  const body = () => {
    if (isLoading && rows.length === 0) {
      return (
        <div className='space-y-2 p-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className='h-11 w-full rounded-lg' />
          ))}
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
          <div className='flex size-14 items-center justify-center rounded-xl bg-muted'>
            <AlertTriangle className='text-muted-foreground size-6' />
          </div>
          <div>
            <p className='font-medium'>No audit records found.</p>
            <p className='text-muted-foreground mt-1 max-w-md text-sm'>{emptyHint}</p>
          </div>
        </div>
      );
    }

    return (
      <PosTable>
        <PosTableHead>
          <tr>
            <PosTableHeaderCell className='w-10'>
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                aria-label='Select all'
              />
            </PosTableHeaderCell>
            {col('timestamp') ? <PosTableHeaderCell>Timestamp</PosTableHeaderCell> : null}
            {col('user') ? <PosTableHeaderCell>User</PosTableHeaderCell> : null}
            {col('action') ? <PosTableHeaderCell>Action</PosTableHeaderCell> : null}
            {showModule ? <PosTableHeaderCell>Module</PosTableHeaderCell> : null}
            {col('description') ? <PosTableHeaderCell>Description</PosTableHeaderCell> : null}
            {col('ip') ? <PosTableHeaderCell>IP address</PosTableHeaderCell> : null}
            {col('severity') ? <PosTableHeaderCell>Severity</PosTableHeaderCell> : null}
            {col('status') ? <PosTableHeaderCell>Status</PosTableHeaderCell> : null}
            <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
          </tr>
        </PosTableHead>
        <PosTableBody>
          {rows.map((entry) => (
            <AuditLogRow
              key={entry.id}
              entry={entry}
              selected={selected.has(entry.id)}
              showModuleColumn={showModule}
              col={col}
              onToggle={() => onToggleRow(entry.id)}
              onView={() => onView(entry)}
              onCopyId={() => onCopyId(entry.id)}
            />
          ))}
        </PosTableBody>
      </PosTable>
    );
  };

  return (
    <PosTableCard
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder='Search audit logs...'
      columns={[...AUDIT_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={(ids) => onVisibleColsChange(ids as AuditColumnId[])}
      footer={
        total > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={[15, 25, 50]}
            itemLabel='entries'
          />
        ) : null
      }
    >
      {body()}
    </PosTableCard>
  );
}
