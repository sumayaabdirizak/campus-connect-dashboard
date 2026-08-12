import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DeanReports } from '@/lib/dean/types';
import {
  BAR_COLORS,
  ChartCard,
  EmptyChart,
  PIE_COLORS,
} from './faculty-reports-chart-ui';

export function FacultyDeanReportsAnalyticsCharts({ data }: { data?: DeanReports }) {
  return (
    <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
      <ChartCard title='Department performance comparison'>
        {data?.charts.departmentPerformance.length ? (
          <ResponsiveContainer width='100%' height={240}>
            <BarChart data={data.charts.departmentPerformance}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='department' tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey='gpa' fill={BAR_COLORS[0]} radius={[4, 4, 0, 0]} name='GPA' />
              <Bar dataKey='passRate' fill={BAR_COLORS[1]} radius={[4, 4, 0, 0]} name='Pass rate' />
              <Bar dataKey='completionRate' fill={BAR_COLORS[2]} radius={[4, 4, 0, 0]} name='Completion' />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message='No department performance data' />
        )}
      </ChartCard>

      <ChartCard title='Student performance distribution'>
        {data?.charts.performanceDistribution.some((d) => d.count > 0) ? (
          <ResponsiveContainer width='100%' height={240}>
            <PieChart>
              <Pie
                data={data.charts.performanceDistribution}
                dataKey='count'
                nameKey='band'
                cx='50%'
                cy='50%'
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.charts.performanceDistribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message='No graded submissions yet' />
        )}
      </ChartCard>
    </div>
  );
}
