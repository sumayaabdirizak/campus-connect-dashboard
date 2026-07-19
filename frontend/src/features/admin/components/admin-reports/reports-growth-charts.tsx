'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import { ChartCard, EmptyChart, PIE_COLORS } from './report-cards';

export function ReportsGrowthCharts({ data }: { data: PlatformAnalytics }) {
  const assignmentPie = [
    {
      name: 'Submitted',
      value: data.charts.assignmentAnalytics.submitted,
      color: PIE_COLORS[0],
    },
    {
      name: 'Pending',
      value: data.charts.assignmentAnalytics.pending,
      color: PIE_COLORS[1],
    },
    { name: 'Late', value: data.charts.assignmentAnalytics.late, color: PIE_COLORS[2] },
  ].filter((d) => d.value > 0);

  return (
    <>
      <ChartCard title='User growth'>
        <ResponsiveContainer width='100%' height={240}>
          <ReLineChart data={data.charts.userGrowthDetailed}>
            <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
            <XAxis dataKey='month' tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={32} />
            <Tooltip />
            <Legend />
            <Line
              type='monotone'
              dataKey='registrations'
              stroke='#6366f1'
              strokeWidth={2}
              dot={false}
              name='Registrations'
            />
            <Line
              type='monotone'
              dataKey='active'
              stroke='#22c55e'
              strokeWidth={2}
              dot={false}
              name='Active'
            />
          </ReLineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title='Course performance'>
        {data.charts.coursePerformance.length === 0 ? (
          <EmptyChart message='No course enrollment data' />
        ) : (
          <ResponsiveContainer width='100%' height={240}>
            <BarChart data={data.charts.coursePerformance.slice(0, 6)}>
              <CartesianGrid
                strokeDasharray='3 3'
                className='stroke-border/50'
                vertical={false}
              />
              <XAxis dataKey='course' tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend />
              <Bar dataKey='enrollments' fill='#6366f1' name='Enrollments' radius={[4, 4, 0, 0]} />
              <Bar dataKey='completions' fill='#22c55e' name='Completions' radius={[4, 4, 0, 0]} />
              <Bar dataKey='dropouts' fill='#ef4444' name='Dropouts' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='Assignment analytics'>
        {assignmentPie.length === 0 ? (
          <EmptyChart message='No assignment data' />
        ) : (
          <div className='flex items-center gap-6'>
            <ResponsiveContainer width={200} height={200}>
              <RePieChart>
                <Pie
                  data={assignmentPie}
                  dataKey='value'
                  nameKey='name'
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {assignmentPie.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
            <div className='space-y-2 text-sm'>
              {assignmentPie.map((d) => (
                <div key={d.name} className='flex items-center gap-2'>
                  <span className='size-2.5 rounded-full' style={{ background: d.color }} />
                  <span className='text-muted-foreground'>{d.name}</span>
                  <span className='font-medium tabular-nums'>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartCard>
    </>
  );
}
