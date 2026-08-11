'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { useUsers } from '@/lib/users/queries';
import { useAddOfficeStaff } from '@/lib/offices/queries';
import type { OfficeStaffMember, OfficeStaffRole } from '@/lib/offices/types';
import { OfficeStaffCandidateRow } from './office-staff-candidate-row';

function notAlreadyStaff(staff: OfficeStaffMember[]) {
  const taken = new Set(staff.map((s) => s.userId));
  return <T extends { id: number }>(u: T) => !taken.has(u.id);
}

export function OfficeStaffAdd({
  officeId,
  staff
}: {
  officeId: number;
  staff: OfficeStaffMember[];
}) {
  const addStaff = useAddOfficeStaff(officeId);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [role, setRole] = useState<OfficeStaffRole>('AGENT');
  const searching = deferredSearch.length >= 2;

  const { data: staffPool, isLoading: poolLoading } = useUsers(
    { page: 1, limit: 50, roles: 'OFFICE_STAFF' },
    { enabled: !searching }
  );
  const { data: searchData, isLoading: searchLoading } = useUsers(
    { page: 1, limit: 20, search: deferredSearch },
    { enabled: searching }
  );

  const candidates = useMemo(() => {
    const source = searching ? (searchData?.users ?? []) : (staffPool?.users ?? []);
    return source.filter(notAlreadyStaff(staff));
  }, [searching, searchData?.users, staffPool?.users, staff]);

  const isLoading = searching ? searchLoading : poolLoading;

  return (
    <div className='space-y-3 border-t pt-4'>
      <div>
        <Label>Add staff</Label>
        <p className='text-muted-foreground mt-0.5 text-xs'>
          Office Staff users are listed below. Or search any user by name/email.
        </p>
      </div>
      <div className='flex gap-2'>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search name or email…'
          className='flex-1'
        />
        <Select value={role} onValueChange={(v) => setRole(v as OfficeStaffRole)}>
          <SelectTrigger className='w-[120px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='AGENT'>Agent</SelectItem>
            <SelectItem value='MANAGER'>Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Loading users…</p>
      ) : candidates.length === 0 ? (
        <div className='space-y-1 text-sm text-muted-foreground'>
          <p>
            {searching
              ? 'No matching users.'
              : 'No Office Staff users available. Create one first, then assign here.'}
          </p>
          {!searching ? (
            <Link
              href='/dashboard/users'
              className='text-primary text-xs font-medium underline-offset-2 hover:underline'
            >
              Go to Users → Add User
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className='max-h-64 space-y-1.5 overflow-y-auto'>
          {candidates.map((u) => (
            <OfficeStaffCandidateRow
              key={u.id}
              fullName={u.full_name}
              email={u.email}
              platformRole={u.role}
              pending={addStaff.isPending}
              onAdd={() => void addStaff.mutateAsync({ userId: u.id, role })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
