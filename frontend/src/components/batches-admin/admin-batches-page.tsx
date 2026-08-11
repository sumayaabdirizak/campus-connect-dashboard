'use client';

import PageContainer from '@/features/layout/components/page-container';
import { BatchesSectionsTabs } from './batches-sections-tabs';

export function AdminBatchesPage() {
  return (
    <PageContainer scrollable={false}>
      <BatchesSectionsTabs />
    </PageContainer>
  );
}
