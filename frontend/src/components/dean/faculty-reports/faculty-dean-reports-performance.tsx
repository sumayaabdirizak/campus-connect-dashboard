import type { DeanReports } from '@/lib/dean/types';
import { ChartCard, EmptyChart } from './faculty-reports-chart-ui';

export function FacultyDeanReportsPerformance({ data }: { data?: DeanReports }) {
  return (
    <ChartCard title='Highest-performing courses'>
      {data?.charts.topCourses.length ? (
        <div className='space-y-2'>
          {data.charts.topCourses.map((c) => (
            <div
              key={c.course}
              className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
            >
              <div>
                <p className='font-medium'>{c.course}</p>
                <p className='text-muted-foreground text-xs'>{c.name}</p>
              </div>
              <div className='text-right text-xs'>
                <p className='font-semibold tabular-nums'>{c.avgScore}% avg</p>
                <p className='text-muted-foreground'>{c.completion}% completion</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart message='No course data' />
      )}
    </ChartCard>
  );
}
