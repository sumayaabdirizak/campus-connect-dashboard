'use client';

import { useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useQueryClient } from '@/lib/async-query';
import { BatchFormModal } from '@/components/batches-admin/batch-form-sheet';
import { DeanBatchesTable } from '@/components/dean/dean-batches-table';

export default function DeanBatchesPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Batches'
        addLabel='Add New'
        onAdd={() => setOpen(true)}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['dean', 'batches'] })}
      />
      <DeanBatchesTable />
      <BatchFormModal open={open} onOpenChange={setOpen} />
    </PageContainer>
  );
}
