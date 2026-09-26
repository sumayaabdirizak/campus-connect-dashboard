'use client';

import { useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { DeanUsersTable } from '@/components/dean/dean-users-table';
import { UserFormModal } from '@/components/users/user-form-modal';

export function DeanRoleUsersPage({
  role,
  title,
}: {
  role: 'STUDENT' | 'TEACHER';
  title: string;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  // Deans can create lecturers (backend restricts them to their own faculty).
  const canAdd = role === 'TEACHER';

  return (
    <PageContainer fill scrollable={false}>
      <div className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4'>
        <PosPageHeader
          title={title}
          addLabel='Add Lecturer'
          onAdd={canAdd ? () => setCreateOpen(true) : undefined}
          onRefresh={() =>
            void queryClient.invalidateQueries({ queryKey: ['dean', 'users'] })
          }
        />
        <DeanUsersTable role={role} />
      </div>
      {canAdd ? (
        <UserFormModal
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) void queryClient.invalidateQueries({ queryKey: ['dean', 'users'] });
          }}
          defaultRole='TEACHER'
          lockRole
        />
      ) : null}
    </PageContainer>
  );
}
