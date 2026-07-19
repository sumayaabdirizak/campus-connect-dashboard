'use client';

import {
  Area,
  AreaChart,
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
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import { ChartCard, EmptyChart, PIE_COLORS } from './dashboard-chart-shared';

export function DashboardGrowthCharts({ data }: { data: PlatformAnalytics }) {
  const userGrowth = data.charts.userGrowthDetailed ?? data.charts.userGrowth ?? [];
  const courseEnrollment =
    data.charts.coursePerformance?.slice(0, 8).map((c) => ({
      name: c.course || c.name,
      enrollments: c.enrollments,
    })) ?? [];
  const assignmentData = data.charts.assignmentAnalytics
    ? [
        { name: 'Submitted', value: data.charts.assignmentAnalytics.submitted },
        { name: 'Pending', value: data.charts.assignmentAnalytics.pending },
        { name: 'Late', value: data.charts.assignmentAnalytics.late },
      ]
    : [];

  return (
    <>
      <ChartCard title='User growth'>
        {userGrowth.length === 0 ? (
          <EmptyChart message='No user growth data yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <AreaChart data={userGrowth}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
              <XAxis dataKey='month' tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend />
              {'registrations' in (userGrowth[0] ?? {}) ? (
                <>
                  <Area
                    type='monotone'
                    dataKey='registrations'
                    stroke='#6366f1'
                    fill='#6366f1'
                    fillOpacity={0.15}
                    name='Registrations'
                  />
                  <Area
                    type='monotone'
                    dataKey='active'
                    stroke='#22c55e'
                    fill='#22c55e'
                    fillOpacity={0.1}
                    name='Active'
                  />
                </>
              ) : (
                <Area
                  type='monotone'
                  dataKey='users'
                  stroke='#6366f1'
                  fill='#6366f1'
                  fillOpacity={0.15}
                  name='Users'
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='Course enrollment'>
        {courseEnrollment.length === 0 ? (
          <EmptyChart message='No enrollment data yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={courseEnrollment} layout='vertical' margin={{ left: 4 }}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' horizontal={false} />
              <XAxis type='number' tick={{ fontSize: 11 }} />
              <YAxis type='category' dataKey='name' width={72} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey='enrollments' fill='#3b82f6' name='Students' radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='Assignment submissions'>
        {assignmentData.every((d) => d.value === 0) ? (
          <EmptyChart message='No assignment data yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie
                data={assignmentData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
              >
                {assignmentData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}
