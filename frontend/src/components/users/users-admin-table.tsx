'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell
} from '@/features/pos/components/pos-table';
import { useQuery } from '@/lib/async-query';
import { showToast } from '@/lib/notifications';
import { fetchUsers } from '@/lib/users/services';
import { usersQueryOptions } from '@/lib/users/queries';
import {
  USER_ALL_COLS,
  USER_COLUMN_OPTS,
  USER_SORT_OPTS,
  exportUsersCsv,
  exportUsersPdf,
  roleTabToApi,
  sortUsers,
  type UserRoleTab
} from '@/lib/users/services/users-table-utils';
import { UserTableRow } from './user-table-row';

type Props = { roleTab: UserRoleTab };

export function UsersAdminTable({ roleTab }: Props) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...USER_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const col = (id: string) => visibleCols.includes(id);

  const apiRole = roleTabToApi(roleTab);
  const { data, isLoading, error } = useQuery({
    ...usersQueryOptions({
      page,
      limit: pageSize,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(apiRole ? { roles: apiRole } : {})
    })
  });

  const users = data?.users ?? [];
  const total = data?.total_users ?? 0;

  const pageRows = useMemo(() => sortUsers(users, sortId), [users, sortId]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, roleTab, pageSize]);

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
        Failed to load users: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search users...'
      columns={[...USER_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={[...USER_SORT_OPTS]}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={async () => {
        try {
          const all = await fetchUsers({
            page: 1,
            limit: 2000,
            ...(deferredSearch ? { search: deferredSearch } : {}),
            ...(apiRole ? { roles: apiRole } : {})
          });
          exportUsersCsv(sortUsers(all.users, sortId));
          showToast('success', `Exported ${all.users.length} users`);
        } catch (e) {
          showToast('error', e instanceof Error ? e.message : 'Export failed');
        }
      }}
      onExportPdf={async () => {
        try {
          const all = await fetchUsers({
            page: 1,
            limit: 2000,
            ...(deferredSearch ? { search: deferredSearch } : {}),
            ...(apiRole ? { roles: apiRole } : {})
          });
          exportUsersPdf(sortUsers(all.users, sortId));
        } catch (e) {
          showToast('error', e instanceof Error ? e.message : 'Export failed');
        }
      }}
      footer={
        total > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='users'
          />
        ) : null
      }
    >
      {total === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{deferredSearch ? 'No matches' : 'No users yet'}</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            {deferredSearch ? 'Try a different search or tab.' : 'Add a user to get started.'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Name</PosTableHeaderCell> : null}
              {col('number') ? <PosTableHeaderCell>University ID</PosTableHeaderCell> : null}
              {col('role') ? <PosTableHeaderCell>Role</PosTableHeaderCell> : null}
              {col('status') ? <PosTableHeaderCell>Status</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((user) => (
              <UserTableRow key={user.id} user={user} col={col} />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
