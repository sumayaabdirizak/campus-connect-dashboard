'use client';

import { Suspense } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { FacultyDashboardReportView } from '@/components/reports/faculty-dashboard/faculty-dashboard-report-view';

function FacultyDashboardInner() {
  return (
    <PageContainer fill>
      <div className='flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto bg-[#F2F4F7] p-3 dark:bg-background md:p-4'>
        <FacultyDashboardReportView />
      </div>
    </PageContainer>
  );
}

export default function FacultyDashboardPage() {
  return (
    <Suspense
      fallback={
        <PageContainer fill>
          <div className='flex min-h-0 flex-1 items-center justify-center bg-[#F2F4F7] p-4 text-sm text-[#667085] dark:bg-background'>
            Loading faculty dashboard…
          </div>
        </PageContainer>
      }
    >
      <FacultyDashboardInner />
    </Suspense>
  );
}
