'use client';

import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { DeanUsersTable } from '@/components/dean/dean-users-table';

export default function DeanUsersPage() {
  const queryClient = useQueryClient();

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Faculty Members'
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['dean', 'users'] })}
      />
      <DeanUsersTable />
    </PageContainer>
  );
}

