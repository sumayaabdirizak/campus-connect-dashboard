'use client';

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import { ChartCard, EmptyChart, QUIZ_COLORS } from './dashboard-chart-shared';

export function DashboardPerformanceCharts({ data }: { data: PlatformAnalytics }) {
  const quizPerf = data.charts.quizPerformance;
  const quizChartData = quizPerf
    ? [
        { name: 'Passed', value: quizPerf.passed },
        { name: 'Failed', value: quizPerf.failed },
      ]
    : [];
  const systemUsage = data.charts.systemUsage ?? [];

  return (
    <>
      <ChartCard title='Quiz performance'>
        {quizChartData.every((d) => d.value === 0) ? (
          <EmptyChart message='No quiz attempts yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie
                data={quizChartData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={52}
                outerRadius={78}
              >
                {quizChartData.map((_, i) => (
                  <Cell key={i} fill={QUIZ_COLORS[i % QUIZ_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='System activity'>
        {systemUsage.length === 0 ? (
          <EmptyChart message='No activity recorded yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <LineChart data={systemUsage}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
              <XAxis dataKey='day' tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend />
              <Line
                type='monotone'
                dataKey='visits'
                stroke='#7c3aed'
                strokeWidth={2}
                dot={false}
                name='Activity'
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}
