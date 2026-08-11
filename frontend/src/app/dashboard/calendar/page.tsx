'use client';

import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { CalendarPage } from '@/components/calendar/calendar-page';
import { useQueryClient } from '@/lib/async-query';

export default function Page() {
  const queryClient = useQueryClient();

  return (
    <PageContainer scrollable={false} fill>
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <PosPageHeader
          title='Calendar'
          onRefresh={() =>
            void queryClient.invalidateQueries({ queryKey: ['calendar'] })
          }
        />
        <div className='min-h-0 flex-1'>
          <CalendarPage />
        </div>
      </div>
    </PageContainer>
  );
}
