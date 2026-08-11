'use client';

import { useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs';
import { useQueryClient } from '@/lib/async-query';
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import { AcademicYearFormSheet } from './academic-year-form-sheet';
import { AcademicYearToolsMenu } from './academic-year-tools-menu';
import { AcademicYearsTable } from './academic-years-table';
import { SemestersMasterTable } from './semesters-master-table';

type TabId = 'years' | 'semesters';

export function AdminAcademicYearsPage() {
  const [tab, setTab] = useState<TabId>('years');
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminAcademicYearsQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['admin-semesters-flat'] });
  };

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title={tab === 'years' ? 'Academic Years' : 'Semesters'}
        onAdd={tab === 'years' ? () => setCreateOpen(true) : undefined}
        onRefresh={refresh}
      >
        <AcademicYearToolsMenu />
      </PosPageHeader>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabId)}
        className='gap-3'
      >
        <TabsList className='h-10 w-full max-w-full justify-start overflow-x-auto rounded-full bg-muted/80 p-1 sm:w-auto'>
          <TabsTrigger value='years' className='rounded-full px-4'>
            Academic Years
          </TabsTrigger>
          <TabsTrigger value='semesters' className='rounded-full px-4'>
            Semesters
          </TabsTrigger>
        </TabsList>

        <TabsContent value='years' className='mt-0'>
          <AcademicYearsTable />
        </TabsContent>
        <TabsContent value='semesters' className='mt-0'>
          <SemestersMasterTable />
        </TabsContent>
      </Tabs>

      <AcademicYearFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageContainer>
  );
}
