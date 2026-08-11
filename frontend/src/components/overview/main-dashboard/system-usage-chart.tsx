'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Calendar } from 'lucide-react'
import type { PlatformAnalytics } from '@/lib/admin'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/components/dropdown-menu'
import { ChartCard, EmptyChart, chartTooltipStyle } from './dashboard-chart-shared'
import { CHART_ANIM } from './dashboard-motion'
import type { AnalyticsPeriod } from './main-dashboard-period'
import { PERIOD_LABELS, PERIOD_OPTIONS } from './main-dashboard-period'

const USAGE_GREEN = '#10B981'

/** System usage / daily visits — real login-activity trend (replaces the empty User growth chart). */
export function SystemUsageChart({
  data,
  tall = false,
  period,
  onPeriodChange,
}: {
  data: PlatformAnalytics
  tall?: boolean
  period: AnalyticsPeriod
  onPeriodChange: (next: AnalyticsPeriod) => void
}) {
  const usage = data.charts.systemUsage ?? []
  const height = tall ? 280 : 200

  return (
    <ChartCard
      title='System usage'
      subtitle='Daily visits'
      index={0}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type='button'
              className='inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#344054] transition-colors hover:bg-[#F8FAFC]'
            >
              <Calendar className='size-3.5' />
              {PERIOD_LABELS[period]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {PERIOD_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt} onClick={() => onPeriodChange(opt)}>
                {PERIOD_LABELS[opt]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {usage.length === 0 ? (
        <EmptyChart message='No usage data yet' />
      ) : (
        <ResponsiveContainer width='100%' height={height}>
          <AreaChart data={usage} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id='dashSystemUsage' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={USAGE_GREEN} stopOpacity={0.32} />
                <stop offset='100%' stopColor={USAGE_GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' vertical={false} />
            <XAxis dataKey='day' tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#667085' }} width={32} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle()} />
            <Area
              type='monotone'
              dataKey='visits'
              stroke={USAGE_GREEN}
              strokeWidth={2.5}
              fill='url(#dashSystemUsage)'
              name='Visits'
              dot={{ r: 3, fill: USAGE_GREEN, strokeWidth: 0 }}
              animationDuration={CHART_ANIM.duration}
              animationEasing={CHART_ANIM.easing}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
