'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell
} from '@/features/pos/components/pos-table';
import { Badge } from '@/components/ui/badge';
import { useDeanUsers } from '@/lib/dean/queries';
import type { DeanUser } from '@/lib/dean/types';

export function DeanUsersTable() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { data, isLoading, error } = useDeanUsers();

  const users: DeanUser[] = useMemo(() => {
    const raw = data as unknown;
    if (Array.isArray(raw)) return raw as DeanUser[];
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.results)) return obj.results as DeanUser[];
      if (Array.isArray(obj.users)) return obj.users as DeanUser[];
    }
    return [];
  }, [data]);

  const filtered = useMemo(() => {
    if (!deferredSearch) return users;
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(deferredSearch) ||
        u.email?.toLowerCase().includes(deferredSearch) ||
        u.number?.toLowerCase().includes(deferredSearch)
    );
  }, [users, deferredSearch]);

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
        Failed to load faculty members: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search faculty members...'
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{deferredSearch ? 'No matches' : 'No faculty members yet'}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              <PosTableHeaderCell>Name</PosTableHeaderCell>
              <PosTableHeaderCell>Email</PosTableHeaderCell>
              <PosTableHeaderCell>University ID</PosTableHeaderCell>
              <PosTableHeaderCell>Role</PosTableHeaderCell>
              <PosTableHeaderCell>Status</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {filtered.map((user) => (
              <tr key={user.id} className='border-b last:border-0'>
                <td className='px-4 py-3 text-sm font-medium'>{user.full_name}</td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>{user.email}</td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>{user.number}</td>
                <td className='px-4 py-3 text-sm'>{user.role}</td>
                <td className='px-4 py-3 text-sm'>
                  <Badge
                    variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                  >
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
