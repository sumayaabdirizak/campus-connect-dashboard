import type { DeanReports } from '@/lib/dean/types';
import { ChartCard, EmptyChart } from './faculty-reports-chart-ui';

export function FacultyDeanReportsTopStudents({ data }: { data?: DeanReports }) {
  const rows = data?.tables.topStudents ?? [];
  return (
    <ChartCard title='Top students (by GPA)'>
      {rows.length ? (
        <div className='space-y-2'>
          {rows.map((s) => (
            <div
              key={s.id}
              className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
            >
              <div className='flex items-center gap-3'>
                <span className='text-muted-foreground w-5 text-right text-xs font-semibold tabular-nums'>
                  {s.rank}
                </span>
                <div>
                  <p className='font-medium'>{s.student}</p>
                  <p className='text-muted-foreground text-xs'>{s.department}</p>
                </div>
              </div>
              <div className='text-right text-xs'>
                <p className='font-semibold tabular-nums'>{s.gpa.toFixed(2)} GPA</p>
                <p className='text-muted-foreground'>{s.onTimeRate}% on time</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart message='No student data' />
      )}
    </ChartCard>
  );
}
