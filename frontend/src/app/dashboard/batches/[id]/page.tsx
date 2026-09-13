'use client';

import { use } from 'react';
import { BatchOverviewPage } from '@/components/batches-admin/batch-overview-page';

export default function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const batchId = Number(id);
  if (!Number.isFinite(batchId) || batchId <= 0) {
    return (
      <div className='p-6 text-sm text-destructive'>Invalid batch id.</div>
    );
  }
  return <BatchOverviewPage batchId={batchId} />;
}
