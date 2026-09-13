'use client';

import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { DeanUsersTable } from '@/components/dean/dean-users-table';

export function DeanRoleUsersPage({
  role,
  title,
}: {
  role: 'STUDENT' | 'TEACHER';
  title: string;
}) {
  const queryClient = useQueryClient();

  return (
    <PageContainer fill scrollable={false}>
      <div className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4'>
        <PosPageHeader
          title={title}
          onRefresh={() =>
            void queryClient.invalidateQueries({ queryKey: ['dean', 'users'] })
          }
        />
        <DeanUsersTable role={role} />
      </div>
    </PageContainer>
  );
}
