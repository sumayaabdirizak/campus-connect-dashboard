'use client';

import { AlertTriangle } from 'lucide-react';
import type { PlatformAuditLogEntry } from '@/features/admin/api/admin-api';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AuditLogRow } from './audit-log-row';

interface AuditLogsTableProps {
  rows: PlatformAuditLogEntry[];
  isLoading: boolean;
  selected: Set<string>;
  allSelected: boolean;
  showModuleColumn: boolean;
  emptyHint: string;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onView: (entry: PlatformAuditLogEntry) => void;
  onCopyId: (id: string) => void;
}

export function AuditLogsTable({
  rows,
  isLoading,
  selected,
  allSelected,
  showModuleColumn,
  emptyHint,
  onToggleAll,
  onToggleRow,
  onView,
  onCopyId,
}: AuditLogsTableProps) {
  if (isLoading && rows.length === 0) {
    return (
      <div className='absolute inset-0 space-y-2 overflow-y-auto p-4'>
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className='h-11 w-full rounded-lg' />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center'>
        <div className='flex size-14 items-center justify-center rounded-2xl bg-muted'>
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
    <div className='absolute inset-0 overflow-x-auto overflow-y-auto overscroll-contain'>
      <Table className='w-full min-w-0'>
        <TableHeader className='sticky top-0 z-10 bg-card shadow-sm [&_tr]:border-b'>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='bg-card w-10'>
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                aria-label='Select all'
              />
            </TableHead>
            <TableHead className='bg-card w-[128px]'>Timestamp</TableHead>
            <TableHead className='bg-card min-w-[160px]'>User</TableHead>
            <TableHead className='bg-card w-[100px]'>Action</TableHead>
            {showModuleColumn ? (
              <TableHead className='bg-card w-[110px]'>Module</TableHead>
            ) : null}
            <TableHead className='bg-card min-w-[180px]'>Description</TableHead>
            <TableHead className='bg-card w-[100px]'>IP address</TableHead>
            <TableHead className='bg-card w-[88px]'>Severity</TableHead>
            <TableHead className='bg-card w-[80px]'>Status</TableHead>
            <TableHead className='bg-card w-10' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((entry) => (
            <AuditLogRow
              key={entry.id}
              entry={entry}
              selected={selected.has(entry.id)}
              showModuleColumn={showModuleColumn}
              onToggle={() => onToggleRow(entry.id)}
              onView={() => onView(entry)}
              onCopyId={() => onCopyId(entry.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
