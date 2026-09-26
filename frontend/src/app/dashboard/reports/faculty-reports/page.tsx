'use client';

import { Suspense } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { FacultyReportsView } from '@/components/reports/faculty-reports/faculty-reports-view';

function FacultyReportsInner() {
  return (
    <PageContainer fill>
      <div className='flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto bg-[#F2F4F7] p-3 dark:bg-background md:p-4'>
        <FacultyReportsView />
      </div>
    </PageContainer>
  );
}

export default function FacultyReportsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer fill>
          <div className='flex min-h-0 flex-1 items-center justify-center bg-[#F2F4F7] p-4 text-sm text-[#667085] dark:bg-background'>
            Loading faculty reports…
          </div>
        </PageContainer>
      }
    >
      <FacultyReportsInner />
    </Suspense>
  );
}
