'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BookOpen,
  GraduationCap,
  ListTodo,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'

export type KpiStripItem = {
  key: string
  label: string
  value: string
  trend?: number
  hint?: string
}

const KPI_ICONS: Record<string, LucideIcon> = {
  users: Users,
  active: UserCheck,
  students: GraduationCap,
  teachers: Users,
  courses: BookOpen,
  pending: ListTodo,
  sessions: Activity,
}

type Props = {
  items: KpiStripItem[]
  loading?: boolean
}

/** Retail-style KPI tiles for Super Admin platform health. */
export function DashboardKpiStrip({ items, loading }: Props) {
  const reduce = useReducedMotion()
  const cols =
    items.length >= 6
      ? 'xl:grid-cols-6'
      : items.length === 5
        ? 'xl:grid-cols-5'
        : 'xl:grid-cols-4'

  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', cols)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className='space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm'
          >
            <Skeleton className='size-10 rounded-lg' />
            <Skeleton className='h-7 w-16' />
            <Skeleton className='h-3 w-24' />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', cols)}>
      {items.map((item, i) => {
        const Icon = KPI_ICONS[item.key] ?? Users
        return (
          <motion.div
            key={item.key}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className='rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm'
          >
            <div className='flex items-start justify-between gap-2'>
              <span className='flex size-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3B82F6]'>
                <Icon className='size-5' aria-hidden />
              </span>
              {item.trend != null && item.trend !== 0 ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                    item.trend > 0
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : 'bg-[#FEF3F2] text-[#B42318]'
                  )}
                >
                  {item.trend > 0 ? (
                    <TrendingUp className='size-3' aria-hidden />
                  ) : (
                    <TrendingDown className='size-3' aria-hidden />
                  )}
                  {Math.abs(item.trend)}%
                </span>
              ) : null}
            </div>
            <p className='mt-3 text-2xl font-bold tracking-tight text-[#101828] tabular-nums'>
              {item.value}
            </p>
            <p className='mt-0.5 text-sm font-medium text-[#344054]'>{item.label}</p>
            <p className='mt-1 text-[11px] text-[#98A2B3]'>{item.hint ?? 'Platform'}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
