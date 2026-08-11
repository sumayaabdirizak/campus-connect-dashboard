'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PlatformAnalytics } from '@/lib/admin'
import { ChartCard, EmptyChart, chartTooltipStyle } from './dashboard-chart-shared'
import { CHART_ANIM, CHART_BLUE, CHART_SLATE } from './dashboard-motion'

export function UserGrowthChart({
  data,
  tall = false,
}: {
  data: PlatformAnalytics
  tall?: boolean
}) {
  const userGrowth = data.charts.userGrowthDetailed ?? data.charts.userGrowth ?? []
  const detailed = 'registrations' in (userGrowth[0] ?? {})
  const height = tall ? 280 : 200

  return (
    <ChartCard title='User growth' subtitle='Registrations vs active users' index={0}>
      {userGrowth.length === 0 ? (
        <EmptyChart message='No user growth data yet' />
      ) : (
        <ResponsiveContainer width='100%' height={height}>
          <AreaChart data={userGrowth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id='dashGrowReg' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={CHART_BLUE} stopOpacity={0.28} />
                <stop offset='100%' stopColor={CHART_BLUE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id='dashGrowActive' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={CHART_SLATE} stopOpacity={0.22} />
                <stop offset='100%' stopColor={CHART_SLATE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' vertical={false} />
            <XAxis dataKey='month' tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#667085' }} width={32} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {detailed ? (
              <>
                <Area
                  type='monotone'
                  dataKey='registrations'
                  stroke={CHART_BLUE}
                  strokeWidth={2}
                  fill='url(#dashGrowReg)'
                  name='Registrations'
                  animationDuration={CHART_ANIM.duration}
                  animationEasing={CHART_ANIM.easing}
                />
                <Area
                  type='monotone'
                  dataKey='active'
                  stroke={CHART_SLATE}
                  strokeWidth={2}
                  fill='url(#dashGrowActive)'
                  name='Active'
                  animationDuration={CHART_ANIM.durationSlow}
                  animationEasing={CHART_ANIM.easing}
                />
              </>
            ) : (
              <Area
                type='monotone'
                dataKey='users'
                stroke={CHART_BLUE}
                strokeWidth={2}
                fill='url(#dashGrowReg)'
                name='Users'
                animationDuration={CHART_ANIM.duration}
                animationEasing={CHART_ANIM.easing}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
