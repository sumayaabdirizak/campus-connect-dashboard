'use client'

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
} from 'recharts'
import type { PlatformAnalytics } from '@/lib/admin'
import {
  ChartCard,
  EmptyChart,
  QUIZ_COLORS,
  chartTooltipStyle,
} from './dashboard-chart-shared'
import { CHART_ANIM, CHART_BLUE } from './dashboard-motion'

export function DashboardPerformanceCharts({ data }: { data: PlatformAnalytics }) {
  const quizPerf = data.charts.quizPerformance
  const quizChartData = quizPerf
    ? [
        { name: 'Passed', value: quizPerf.passed },
        { name: 'Failed', value: quizPerf.failed },
      ]
    : []
  const systemUsage = data.charts.systemUsage ?? []

  return (
    <>
      <ChartCard title='Quiz performance' subtitle='Pass vs fail attempts' index={3}>
        {quizChartData.every((d) => d.value === 0) ? (
          <EmptyChart message='No quiz attempts yet' />
        ) : (
          <ResponsiveContainer width='100%' height={200}>
            <PieChart>
              <Pie
                data={quizChartData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                animationDuration={CHART_ANIM.duration}
                animationEasing={CHART_ANIM.easing}
              >
                {quizChartData.map((_, i) => (
                  <Cell key={i} fill={QUIZ_COLORS[i % QUIZ_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle()} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='System activity' subtitle='Recent platform visits' index={4}>
        {systemUsage.length === 0 ? (
          <EmptyChart message='No activity recorded yet' />
        ) : (
          <ResponsiveContainer width='100%' height={200}>
            <LineChart data={systemUsage} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' vertical={false} />
              <XAxis dataKey='day' tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#667085' }} width={32} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle()} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type='monotone'
                dataKey='visits'
                stroke={CHART_BLUE}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: CHART_BLUE }}
                name='Activity'
                animationDuration={CHART_ANIM.durationSlow}
                animationEasing={CHART_ANIM.easing}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  )
}
