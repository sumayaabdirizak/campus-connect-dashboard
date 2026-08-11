'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PlatformAnalytics } from '@/lib/admin'
import { ChartCard, EmptyChart, chartTooltipStyle } from './dashboard-chart-shared'
import { CHART_ANIM, CHART_BLUE } from './dashboard-motion'

export function DashboardCourseEnrollmentChart({ data }: { data: PlatformAnalytics }) {
  const courseEnrollment =
    data.charts.coursePerformance?.slice(0, 8).map((c) => ({
      name: c.course || c.name,
      enrollments: c.enrollments,
    })) ?? []

  return (
    <ChartCard title='Course enrollment' subtitle='Top courses by students' index={1}>
      {courseEnrollment.length === 0 ? (
        <EmptyChart message='No enrollment data yet' />
      ) : (
        <ResponsiveContainer width='100%' height={200}>
          <BarChart
            data={courseEnrollment}
            layout='vertical'
            margin={{ left: 4, right: 8, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' horizontal={false} />
            <XAxis type='number' tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} />
            <YAxis
              type='category'
              dataKey='name'
              width={72}
              tick={{ fontSize: 10, fill: '#667085' }}
              axisLine={false}
            />
            <Tooltip contentStyle={chartTooltipStyle()} />
            <Bar
              dataKey='enrollments'
              fill={CHART_BLUE}
              name='Students'
              radius={[0, 6, 6, 0]}
              maxBarSize={18}
              animationDuration={CHART_ANIM.duration}
              animationEasing={CHART_ANIM.easing}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
