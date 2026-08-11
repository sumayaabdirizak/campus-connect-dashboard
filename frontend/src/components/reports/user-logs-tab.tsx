'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@/lib/async-query';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import type { PosDateRange } from '@/features/pos/components/pos-table-toolbar';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import { PosTable, PosTableBody, PosTableHead, PosTableHeaderCell, PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { Badge } from '@/features/ui/components/badge';
import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';
import { showToast } from '@/lib/notifications';
import { fetchUserLoginLogs } from '@/lib/reports/queries';
import type { OversightScope } from '@/lib/reports/types';

const COLUMN_OPTS = [
  { id: 'user', label: 'User' },
  { id: 'role', label: 'Role' },
  { id: 'loginAt', label: 'Login time' },
  { id: 'ip', label: 'IP address' },
  { id: 'agent', label: 'Device / browser' }
] as const;
const ALL_COLS = COLUMN_OPTS.map((c) => c.id);

export function UserLogsTab({ scope, facultyId }: { scope: OversightScope; facultyId?: number | null }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<PosDateRange>({ from: null, to: null });
  const [visibleCols, setVisibleCols] = useState<string[]>([...ALL_COLS]);
  const col = (id: string) => visibleCols.includes(id);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange]);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'reports',
      scope,
      'user-logins',
      facultyId ?? null,
      page,
      pageSize,
      search,
      dateRange.from,
      dateRange.to
    ],
    queryFn: () =>
      fetchUserLoginLogs(scope, {
        page,
        pageSize,
        search,
        facultyId,
        from: dateRange.from,
        to: dateRange.to
      })
  });

  const rows = data?.results ?? [];
  const total = data?.totalCount ?? 0;

  const exportRows = useMemo(
    () =>
      rows.map((r) => [
        r.fullName,
        r.email,
        r.role ?? '',
        new Date(r.loginAt).toLocaleString(),
        r.ipAddress ?? '',
        r.userAgent ?? ''
      ]),
    [rows]
  );
  const exportHeader = ['Name', 'Email', 'Role', 'Login time', 'IP address', 'User agent'];

  if (isLoading && !data) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
        <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }
  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load login history: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search name, email or ID...'
      showDateRange
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      columns={[...COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      onExportExcel={() => {
        downloadCsv('user-logins.csv', exportHeader, exportRows);
        showToast('success', 'Exported user-logins.csv');
      }}
      onExportPdf={() => exportTablePdf('User Logs', exportHeader, exportRows)}
      footer={
        total > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='logins'
          />
        ) : null
      }
    >
      {rows.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{search ? 'No matches' : 'No login activity recorded yet'}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('user') ? <PosTableHeaderCell>User</PosTableHeaderCell> : null}
              {col('role') ? <PosTableHeaderCell>Role</PosTableHeaderCell> : null}
              {col('loginAt') ? <PosTableHeaderCell>Login time</PosTableHeaderCell> : null}
              {col('ip') ? <PosTableHeaderCell>IP address</PosTableHeaderCell> : null}
              {col('agent') ? <PosTableHeaderCell>Device / browser</PosTableHeaderCell> : null}
            </tr>
          </PosTableHead>
          <PosTableBody>
            {rows.map((r) => (
              <PosTableRow key={r.id}>
                {col('user') ? (
                  <PosTableCell>
                    <p className='text-sm font-medium'>{r.fullName}</p>
                    <p className='text-xs text-muted-foreground'>{r.email}</p>
                  </PosTableCell>
                ) : null}
                {col('role') ? (
                  <PosTableCell>
                    <Badge variant='outline' className='border-primary/20 bg-primary/10 text-primary'>
                      {r.role ?? '—'}
                    </Badge>
                  </PosTableCell>
                ) : null}
                {col('loginAt') ? (
                  <PosTableCell>
                    <span className='text-sm'>{new Date(r.loginAt).toLocaleString()}</span>
                  </PosTableCell>
                ) : null}
                {col('ip') ? (
                  <PosTableCell>
                    <span className='font-mono text-xs'>{r.ipAddress || '—'}</span>
                  </PosTableCell>
                ) : null}
                {col('agent') ? (
                  <PosTableCell>
                    <span className='truncate text-xs text-muted-foreground' title={r.userAgent ?? ''}>
                      {r.userAgent ? r.userAgent.slice(0, 60) : '—'}
                    </span>
                  </PosTableCell>
                ) : null}
              </PosTableRow>
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
