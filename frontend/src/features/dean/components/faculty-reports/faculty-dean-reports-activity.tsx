import { LineChart } from 'lucide-react';
import type { DeanReports } from '@/features/dean/api/dean-api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyChart } from '@/features/dean/components/faculty-reports/faculty-reports-chart-ui';

export function FacultyDeanReportsActivity({
  data,
  isLoading,
}: {
  data?: DeanReports;
  isLoading: boolean;
}) {
  return (
    <div className='rounded-xl border bg-card p-4 shadow-sm'>
      <div className='mb-3 flex items-center gap-2'>
        <LineChart className='text-muted-foreground size-4' />
        <h2 className='text-sm font-semibold'>Recent activities</h2>
      </div>
      <div className='space-y-3'>
        {isLoading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-14 w-full' />)
        ) : data?.recentActivity.length ? (
          data.recentActivity.map((item) => (
            <div key={item.id} className='flex gap-3'>
              <Avatar className='size-8'>
                <AvatarFallback className='text-xs'>
                  {item.type === 'alert' ? '!' : 'R'}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{item.title}</p>
                <p className='text-muted-foreground line-clamp-2 text-xs'>{item.description}</p>
                <p className='text-muted-foreground mt-0.5 text-[10px]'>
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <EmptyChart message='No recent activity' />
        )}
      </div>
    </div>
  );
}
