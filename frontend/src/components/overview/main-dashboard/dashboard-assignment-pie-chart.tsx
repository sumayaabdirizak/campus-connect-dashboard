'use client'

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PlatformAnalytics } from '@/lib/admin'
import { ChartCard, EmptyChart, PIE_COLORS, chartTooltipStyle } from './dashboard-chart-shared'
import { CHART_ANIM } from './dashboard-motion'

export function DashboardAssignmentPieChart({ data }: { data: PlatformAnalytics }) {
  const assignmentData = data.charts.assignmentAnalytics
    ? [
        { name: 'Submitted', value: data.charts.assignmentAnalytics.submitted },
        { name: 'Pending', value: data.charts.assignmentAnalytics.pending },
        { name: 'Late', value: data.charts.assignmentAnalytics.late },
      ]
    : []

  return (
    <ChartCard title='Assignment submissions' subtitle='Submitted · pending · late' index={2}>
      {assignmentData.every((d) => d.value === 0) ? (
        <EmptyChart message='No assignment data yet' />
      ) : (
        <ResponsiveContainer width='100%' height={200}>
          <PieChart>
            <Pie
              data={assignmentData}
              dataKey='value'
              nameKey='name'
              cx='50%'
              cy='50%'
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              animationDuration={CHART_ANIM.durationSlow}
              animationEasing={CHART_ANIM.easing}
            >
              {assignmentData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
