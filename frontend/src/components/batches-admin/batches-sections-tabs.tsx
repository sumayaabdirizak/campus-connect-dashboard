'use client';

import { useState } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs';
import {
  adminBatchSectionsQueryKey,
  adminBatchesQueryKey
} from '@/lib/batches-admin/queries';
import { BatchFormModal } from './batch-form-sheet';
import { BatchesAdminTable } from './batches-admin-table';
import { SectionFormSheet } from './section-form-sheet';
import { SectionsAdminTable } from './sections-admin-table';

type TabId = 'batches' | 'sections';

export function BatchesSectionsTabs() {
  const [tab, setTab] = useState<TabId>('batches');
  const [batchOpen, setBatchOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminBatchesQueryKey });
    void queryClient.invalidateQueries({ queryKey: adminBatchSectionsQueryKey });
  };

  return (
    <>
      <PosPageHeader
        title={tab === 'batches' ? 'Batches' : 'Sections'}
        addLabel='Add New'
        onAdd={() => (tab === 'batches' ? setBatchOpen(true) : setSectionOpen(true))}
        onRefresh={refresh}
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabId)}
        className='gap-3'
      >
        <TabsList className='h-10 w-full max-w-full justify-start overflow-x-auto rounded-full bg-muted/80 p-1 sm:w-auto'>
          <TabsTrigger value='batches' className='rounded-full px-4'>
            Batches
          </TabsTrigger>
          <TabsTrigger value='sections' className='rounded-full px-4'>
            Sections
          </TabsTrigger>
        </TabsList>

        <TabsContent value='batches' className='mt-0'>
          <BatchesAdminTable />
        </TabsContent>
        <TabsContent value='sections' className='mt-0'>
          <SectionsAdminTable />
        </TabsContent>
      </Tabs>

      <BatchFormModal open={batchOpen} onOpenChange={setBatchOpen} />
      <SectionFormSheet open={sectionOpen} onOpenChange={setSectionOpen} />
    </>
  );
}
