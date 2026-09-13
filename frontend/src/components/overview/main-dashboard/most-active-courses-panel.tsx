'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PlatformAnalytics } from '@/lib/admin'
import { ChartCard, EmptyChart, chartTooltipStyle } from './dashboard-chart-shared'
import { CHART_ANIM } from './dashboard-motion'

const BAR_COLORS = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE']

/** Courses ranked by discussion activity (messages + posts) — engagement, not enrollment. */
export function MostActiveCoursesPanel({
  data,
  loading,
}: {
  data?: PlatformAnalytics
  loading?: boolean
}) {
  const rows = [...(data?.charts.mostActiveCourses ?? [])]
    .sort((a, b) => b.messages + b.posts - (a.messages + a.posts))
    .slice(0, 5)
    .map((c) => ({ name: c.code, activity: c.messages + c.posts, msgs: c.messages, posts: c.posts }))
    .reverse()

  return (
    <ChartCard title='Most Active Courses' subtitle='Messages + posts' index={0} className='h-full'>
      {loading ? (
        <p className='py-6 text-center text-sm text-muted-foreground'>Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyChart message='No discussion activity yet' />
      ) : (
        <ResponsiveContainer width='100%' height={220}>
          <BarChart data={rows} layout='vertical' margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' horizontal={false} />
            <XAxis type='number' tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} />
            <YAxis
              type='category'
              dataKey='name'
              width={64}
              tick={{ fontSize: 11, fill: '#667085', fontWeight: 600 }}
              axisLine={false}
            />
            <Tooltip
              contentStyle={chartTooltipStyle()}
              formatter={(_value, _n, item) => {
                const p = item?.payload as { msgs: number; posts: number } | undefined
                return [p ? `${p.msgs} msgs · ${p.posts} posts` : '', 'Activity']
              }}
            />
            <Bar
              dataKey='activity'
              name='Activity'
              radius={[0, 6, 6, 0]}
              maxBarSize={18}
              animationDuration={CHART_ANIM.duration}
              animationEasing={CHART_ANIM.easing}
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
