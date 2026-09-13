'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'

export const PIE_COLORS = ['#3B82F6', '#94A3B8', '#CBD5E1']
export const QUIZ_COLORS = ['#3B82F6', '#94A3B8']

/** Retail-style chart card: clean header, blue accent bar, light fade. */
export function ChartCard({
  title,
  subtitle,
  children,
  className,
  index = 0,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  index?: number
  action?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card',
        className
      )}
    >
      <div className='flex items-start justify-between gap-2 border-b border-border px-4 py-3'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='h-4 w-1 shrink-0 rounded-full bg-primary' aria-hidden />
            <p className='text-sm font-semibold text-foreground'>{title}</p>
          </div>
          {subtitle ? (
            <p className='mt-0.5 pl-3 text-[11px] text-muted-foreground'>{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className='shrink-0'>{action}</div> : null}
      </div>
      <div className='p-4'>{children}</div>
    </motion.div>
  )
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className='flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted'>
      <p className='text-sm text-muted-foreground'>{message}</p>
    </div>
  )
}

export function ChartSkeleton() {
  return <Skeleton className='h-[200px] w-full rounded-lg' />
}

export function chartTooltipStyle(): React.CSSProperties {
  return {
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 16px rgba(16, 24, 40, 0.08)',
    fontSize: 12,
    padding: '8px 10px',
  }
}
