'use client';

import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { DeanBatchesTable } from '@/components/dean/dean-batches-table';

export default function DeanBatchesPage() {
  const queryClient = useQueryClient();

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Batches'
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['dean', 'batches'] })}
      />
      <DeanBatchesTable />
    </PageContainer>
  );
}

