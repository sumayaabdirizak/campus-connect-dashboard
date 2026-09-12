'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageContainer from '@/features/layout/components/page-container';
import { Icons } from '@/components/icons';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Button } from '@/features/ui/components/button';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import type { UserRoleTab } from '@/lib/users/services/users-table-utils';
import { BulkStudentsModal } from './bulk-students-modal';
import DeanUserManagement from './dean-user-management';
import { UserFormModal } from './user-form-modal';
import { UsersAdminTable } from './users-admin-table';

const TAB_TITLES: Record<UserRoleTab, string> = {
  ALL: 'Users',
  STUDENT: 'Students',
  TEACHER: 'Lecturers',
  DEAN: 'Deans',
  STAFF: 'Staff'
};

const ADD_LABELS: Partial<Record<UserRoleTab, string>> = {
  STUDENT: 'Add Student',
  TEACHER: 'Add Lecturer',
  DEAN: 'Add Dean'
};

const CREATE_ROLE_BY_TAB: Partial<Record<UserRoleTab, string>> = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  DEAN: 'DEAN'
};

function parseRoleTab(raw: string | null): UserRoleTab {
  if (!raw) return 'ALL';
  const upper = raw.toUpperCase();
  if (upper === 'STUDENT' || upper === 'STUDENTS') return 'STUDENT';
  if (upper === 'TEACHER' || upper === 'TEACHERS' || upper === 'LECTURER' || upper === 'LECTURERS') {
    return 'TEACHER';
  }
  if (upper === 'DEAN' || upper === 'DEANS') return 'DEAN';
  if (upper === 'STAFF') return 'STAFF';
  return 'ALL';
}

export default function AdminUsersPage() {
  const role = useAuthStore((state) => state.user?.role);
  const searchParams = useSearchParams();
  const roleTab = parseRoleTab(searchParams?.get('role') ?? null);
  const [createRole, setCreateRole] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const queryClient = useQueryClient();

  const pageTitle = useMemo(() => TAB_TITLES[roleTab], [roleTab]);
  const createDefaultRole = CREATE_ROLE_BY_TAB[roleTab] ?? createRole ?? 'STUDENT';
  const addLabel = ADD_LABELS[roleTab];
  const canAdd = role === 'SUPER_ADMIN' && Boolean(ADD_LABELS[roleTab] || roleTab === 'ALL');
  const showBulk = role === 'SUPER_ADMIN' && roleTab === 'STUDENT';

  if (role === 'DEAN') {
    return (
      <PageContainer scrollable>
        <DeanUserManagement />
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title={pageTitle}
        addLabel={addLabel ?? 'Add Student'}
        onAdd={
          role === 'SUPER_ADMIN' && addLabel
            ? () => setCreateRole(CREATE_ROLE_BY_TAB[roleTab] ?? 'STUDENT')
            : undefined
        }
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['users'] })}
      >
        {roleTab === 'ALL' && role === 'SUPER_ADMIN' ? (
          <>
            <Button
              type='button'
              className='h-9 flex-1 gap-1.5 rounded-full px-4 sm:flex-none'
              onClick={() => setCreateRole('STUDENT')}
            >
              <Icons.add className='size-4' />
              Add Student
            </Button>
            <Button
              type='button'
              className='h-9 flex-1 gap-1.5 rounded-full px-4 sm:flex-none'
              onClick={() => setCreateRole('TEACHER')}
            >
              <Icons.add className='size-4' />
              Add Lecturer
            </Button>
            <Button
              type='button'
              className='h-9 flex-1 gap-1.5 rounded-full px-4 sm:flex-none'
              onClick={() => setCreateRole('DEAN')}
            >
              <Icons.add className='size-4' />
              Add Dean
            </Button>
          </>
        ) : null}
        {showBulk ? (
          <Button
            type='button'
            variant='outline'
            className='h-9 flex-1 gap-1.5 rounded-full px-4 sm:flex-none'
            onClick={() => setBulkOpen(true)}
          >
            <Icons.upload className='size-4' />
            Bulk Students
          </Button>
        ) : null}
      </PosPageHeader>

      <UsersAdminTable roleTab={roleTab === 'ALL' ? 'ALL' : roleTab} />

      {canAdd ? (
        <>
          <UserFormModal
            open={createRole != null}
            onOpenChange={(open) => {
              if (!open) setCreateRole(null);
            }}
            defaultRole={createDefaultRole}
            lockRole
          />
          <BulkStudentsModal open={bulkOpen} onOpenChange={setBulkOpen} />
        </>
      ) : null}
    </PageContainer>
  );
}
