'use client';

import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { DepartmentTable } from './department-table';

export default function DepartmentListingPage() {
  const queryClient = useQueryClient();

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Departments'
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['departments'] })}
      />
      <DepartmentTable />
    </PageContainer>
  );
}
