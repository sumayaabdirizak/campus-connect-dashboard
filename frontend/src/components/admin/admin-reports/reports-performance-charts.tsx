'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlatformAnalytics } from '@/lib/admin/services';
import { ChartCard, EmptyChart } from './report-cards';

export function ReportsPerformanceCharts({ data }: { data: PlatformAnalytics }) {
  return (
    <>
      <ChartCard title='Quiz performance'>
        <ResponsiveContainer width='100%' height={240}>
          <BarChart
            data={[
              { name: 'Avg score', value: data.charts.quizPerformance.averageScore },
              { name: 'Pass rate', value: data.charts.quizPerformance.passRate },
              { name: 'Fail rate', value: data.charts.quizPerformance.failRate },
            ]}
          >
            <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' vertical={false} />
            <XAxis dataKey='name' tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
            <Tooltip />
            <Bar dataKey='value' fill='hsl(var(--primary))' radius={[4, 4, 0, 0]} name='%' />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title='Department performance'>
        {data.charts.departmentPerformance.length === 0 ? (
          <EmptyChart message='No department data' />
        ) : (
          <ResponsiveContainer width='100%' height={240}>
            <BarChart
              data={data.charts.departmentPerformance.slice(0, 8)}
              layout='vertical'
              margin={{ left: 8 }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                className='stroke-border/50'
                horizontal={false}
              />
              <XAxis type='number' domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis type='category' dataKey='name' width={88} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar
                dataKey='completionRate'
                fill='#3b82f6'
                name='Completion %'
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='System usage'>
        <ResponsiveContainer width='100%' height={240}>
          <AreaChart data={data.charts.systemUsage}>
            <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
            <XAxis dataKey='day' tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} width={32} />
            <Tooltip />
            <Area
              type='monotone'
              dataKey='visits'
              stroke='#7c3aed'
              fill='#7c3aed'
              fillOpacity={0.12}
              name='Activity'
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
