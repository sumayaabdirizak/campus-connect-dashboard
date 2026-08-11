'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Skeleton } from '@/features/ui/components/skeleton';
import { cn } from '@/lib/utils';
import { statusDot, toneStyles, type DashboardKpiTone } from './dashboard-kpi-styles';

export type { DashboardKpiTone };
export { DashboardKpiGridSkeleton } from './dashboard-kpi-grid-skeleton';

export interface DashboardKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description: string;
  trend?: number;
  status?: 'positive' | 'negative' | 'neutral' | 'warning';
  tone?: DashboardKpiTone;
  loading?: boolean;
  /** Stagger index for entrance animation. */
  index?: number;
}

export function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  description,
  trend,
  status = 'neutral',
  tone = 'indigo',
  loading,
  index = 0
}: DashboardKpiCardProps) {
  const styles = toneStyles[tone];
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.045, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative min-h-36 overflow-hidden border-b border-border bg-card p-5 transition-colors hover:bg-muted/35 sm:border-r xl:[&:nth-child(4n)]:border-r-0 xl:[&:nth-last-child(-n+4)]:border-b-0',
        styles.card
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-gradient-to-br to-transparent opacity-50 blur-2xl transition-opacity group-hover:opacity-80',
          styles.glow
        )}
        aria-hidden
      />
      <div className='relative flex items-start justify-between gap-2'>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
            styles.icon
          )}
        >
          <Icon className='size-4' aria-hidden />
        </span>
        <div className='flex items-center gap-2'>
          <span
            className={cn('size-2 rounded-full shadow-sm', statusDot[status])}
            title={`Status: ${status}`}
            aria-hidden
          />
          {trend != null && trend !== 0 ? (
            <span
              className={cn(
                'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium backdrop-blur-sm',
                trend > 0 ? 'bg-success-muted text-success' : 'bg-destructive/10 text-destructive'
              )}
            >
              {trend > 0 ? <TrendingUp className='size-3' /> : <TrendingDown className='size-3' />}
              {Math.abs(trend)}%
            </span>
          ) : null}
        </div>
      </div>
      <div className='relative mt-4 flex items-baseline gap-2'>
        {loading ? (
          <Skeleton className='h-8 w-20' />
        ) : (
          <p className={cn('text-3xl font-bold tabular-nums tracking-tight', styles.value)}>
            {value}
          </p>
        )}
        <p className='text-base font-medium'>{label}</p>
      </div>
      <p className='text-muted-foreground relative mt-2 text-xs leading-relaxed'>{description}</p>
    </motion.div>
  );
}
