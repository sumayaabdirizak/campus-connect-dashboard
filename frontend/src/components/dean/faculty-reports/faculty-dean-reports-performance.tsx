import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DeanReports } from '@/lib/dean/types';
import { ChartCard, EmptyChart } from './faculty-reports-chart-ui';

export function FacultyDeanReportsPerformance({ data }: { data?: DeanReports }) {
  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
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

      <ChartCard title='Instructor performance'>
        {data?.charts.instructorPerformance.length ? (
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={data.charts.instructorPerformance} layout='vertical'>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis type='number' domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis type='category' dataKey='name' width={60} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey='completion' fill='#6366f1' name='Completion' radius={[0, 4, 4, 0]} />
              <Bar dataKey='engagement' fill='#22c55e' name='Engagement' radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message='No instructor data' />
        )}
      </ChartCard>
    </div>
  );
}
