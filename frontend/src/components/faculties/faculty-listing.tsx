'use client';

import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { FacultyTable } from './faculty-table';

export default function FacultyListingPage() {
  const queryClient = useQueryClient();

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Faculties'
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['faculties'] })}
      />
      <FacultyTable />
    </PageContainer>
  );
}
