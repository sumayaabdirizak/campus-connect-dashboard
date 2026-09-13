import type { DeanReports } from '@/lib/dean/types';
import { ChartCard, EmptyChart } from './faculty-reports-chart-ui';

export function FacultyDeanReportsTopDepartments({ data }: { data?: DeanReports }) {
  const rows = data?.tables.topDepartments ?? [];
  return (
    <ChartCard title='Top departments (by GPA)'>
      {rows.length ? (
        <div className='space-y-2'>
          {rows.map((d) => (
            <div
              key={d.code}
              className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
            >
              <div className='flex items-center gap-3'>
                <span className='text-muted-foreground w-5 text-right text-xs font-semibold tabular-nums'>
                  {d.rank}
                </span>
                <div>
                  <p className='font-medium'>{d.department}</p>
                  <p className='text-muted-foreground text-xs'>
                    {d.students} students · {d.instructors} instructors
                  </p>
                </div>
              </div>
              <div className='text-right text-xs'>
                <p className='font-semibold tabular-nums'>{d.gpa.toFixed(2)} GPA</p>
                <p className='text-muted-foreground'>{d.passRate}% pass rate</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart message='No department data' />
      )}
    </ChartCard>
  );
}
