'use client'

import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'

export const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444']

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <p className='mb-3 text-sm font-semibold'>{title}</p>
      {children}
    </div>
  )
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  loading,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  hint: string
  trend?: number
  loading?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className='rounded-xl border bg-card p-4'
    >
      <div className='flex items-start justify-between'>
        <span className='flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
          <Icon className='size-4' />
        </span>
        {trend != null && trend !== 0 ? (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend > 0 ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {trend > 0 ? <TrendingUp className='size-3' /> : <TrendingDown className='size-3' />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className='mt-3 h-8 w-20' />
      ) : (
        <p className='mt-3 text-2xl font-semibold tabular-nums'>{value}</p>
      )}
      <p className='mt-1 text-sm font-medium'>{label}</p>
      <p className='text-muted-foreground mt-0.5 text-xs'>{hint}</p>
    </motion.div>
  )
}

export function EmptyChart({ message }: { message: string }) {
  return <p className='text-muted-foreground py-12 text-center text-sm'>{message}</p>
}

/**
 * Animated pulse dot indicator for live/active status
 */
export function LivePulseDot({ color = '#22c55e' }: { color?: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className='size-2 rounded-full'
      style={{ backgroundColor: color }}
    />
  )
}
