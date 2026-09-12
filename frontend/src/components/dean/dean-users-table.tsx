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
import { Badge } from '@/components/ui/badge';
import { useDeanUsers } from '@/lib/dean/queries';
import type { DeanUser, DeanUsersListResponse } from '@/lib/dean/types';
import {
  DeanStudentsFilters,
  defaultDeanStudentFilters,
  type DeanStudentFilterState,
} from './dean-students-filters';

const USERS_FETCH_LIMIT = '500';

function parseDeanUsersResponse(raw: unknown): { users: DeanUser[]; total: number } {
  if (Array.isArray(raw)) {
    return { users: raw as DeanUser[], total: raw.length };
  }
  if (!raw || typeof raw !== 'object') {
    return { users: [], total: 0 };
  }

  const obj = raw as DeanUsersListResponse;
  const users = Array.isArray(obj.results)
    ? obj.results
    : Array.isArray(obj.users)
      ? obj.users
      : [];

  const total =
    obj.totalCount ??
    obj.total ??
    obj.pagination?.total ??
    users.length;

  return { users, total };
}

const ROLE_LABELS: Record<'STUDENT' | 'TEACHER', string> = {
  STUDENT: 'students',
  TEACHER: 'lecturers',
};

function buildUserQueryParams(
  role: 'STUDENT' | 'TEACHER',
  search: string,
  filters?: DeanStudentFilterState
): Record<string, string> {
  const params: Record<string, string> = {
    limit: USERS_FETCH_LIMIT,
    role,
  };
  const trimmed = search.trim();
  if (trimmed) params.search = trimmed;
  if (role === 'STUDENT' && filters) {
    if (filters.departmentId !== 'all') params.departmentId = filters.departmentId;
    if (filters.batchId !== 'all') params.batchId = filters.batchId;
    if (filters.batchSectionId !== 'all') params.batchSectionId = filters.batchSectionId;
  }
  if (role === 'TEACHER' && filters && filters.departmentId !== 'all') {
    params.departmentId = filters.departmentId;
  }
  return params;
}

export function DeanUsersTable({ role }: { role: 'STUDENT' | 'TEACHER' }) {
  const entityLabel = ROLE_LABELS[role];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [studentFilters, setStudentFilters] = useState<DeanStudentFilterState>(
    defaultDeanStudentFilters
  );
  const deferredSearch = useDeferredValue(search.trim());

  const queryParams = useMemo(
    () =>
      buildUserQueryParams(
        role,
        deferredSearch,
        role === 'STUDENT' || role === 'TEACHER' ? studentFilters : undefined
      ),
    [role, deferredSearch, studentFilters]
  );

  const { data, isLoading, error, isFetching } = useDeanUsers(queryParams);

  const { users, total: apiTotal } = useMemo(() => parseDeanUsersResponse(data), [data]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, studentFilters]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

  const searchPlaceholder =
    role === 'STUDENT'
      ? 'Search by name, email, or student ID...'
      : `Search ${entityLabel}...`;

  if (isLoading && !data) {
    return (
      <div className='flex min-h-0 flex-1 items-center justify-center rounded-xl border bg-card'>
        <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load {entityLabel}: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      className='min-h-0 flex-1'
      bodyClassName='min-h-0 flex-1 overflow-y-auto overscroll-contain'
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      toolbarStart={
        role === 'STUDENT' ? (
          <DeanStudentsFilters filters={studentFilters} onChange={setStudentFilters} />
        ) : (
          <DeanStudentsFilters
            filters={studentFilters}
            onChange={setStudentFilters}
            showBatch={false}
            showSection={false}
          />
        )
      }
      footer={
        users.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={users.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel={entityLabel}
          />
        ) : null
      }
    >
      {apiTotal > 0 ? (
        <p className='px-4 pt-3 text-sm text-muted-foreground'>
          {isFetching ? 'Updating… · ' : ''}
          {apiTotal} {entityLabel} loaded
          {users.length < apiTotal ? ` (showing ${users.length} — refresh if incomplete)` : ''}
        </p>
      ) : null}
      {users.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>
            {deferredSearch ||
            (role === 'STUDENT' &&
              (studentFilters.departmentId !== 'all' ||
                studentFilters.batchId !== 'all' ||
                studentFilters.batchSectionId !== 'all'))
              ? 'No matches'
              : `No ${entityLabel} yet`}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead className='sticky top-0 z-10 shadow-[inset_0_-1px_0_0_var(--border)]'>
            <tr>
              <PosTableHeaderCell>Name</PosTableHeaderCell>
              <PosTableHeaderCell>Email</PosTableHeaderCell>
              <PosTableHeaderCell>University ID</PosTableHeaderCell>
              {role === 'STUDENT' ? (
                <>
                  <PosTableHeaderCell>Department</PosTableHeaderCell>
                  <PosTableHeaderCell>Batch</PosTableHeaderCell>
                  <PosTableHeaderCell>Section</PosTableHeaderCell>
                </>
              ) : null}
              <PosTableHeaderCell>Role</PosTableHeaderCell>
              <PosTableHeaderCell>Status</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((user) => (
              <tr key={user.id} className='border-b last:border-0'>
                <td className='px-4 py-3 text-sm font-medium'>{user.full_name}</td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>{user.email}</td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>
                  {user.number || user.studentProfile?.student_number || '—'}
                </td>
                {role === 'STUDENT' ? (
                  <>
                    <td className='px-4 py-3 text-sm text-muted-foreground'>
                      {user.registration?.departmentName ?? '—'}
                    </td>
                    <td className='px-4 py-3 text-sm text-muted-foreground'>
                      {user.registration?.batchName ?? '—'}
                    </td>
                    <td className='px-4 py-3 text-sm text-muted-foreground'>
                      {user.registration?.batchSectionName ?? '—'}
                    </td>
                  </>
                ) : null}
                <td className='px-4 py-3 text-sm'>{user.role}</td>
                <td className='px-4 py-3 text-sm'>
                  <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}

export default DeanUsersTable;
