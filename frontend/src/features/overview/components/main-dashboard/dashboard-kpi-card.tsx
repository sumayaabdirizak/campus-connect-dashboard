'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type DashboardKpiTone =
  | 'indigo'
  | 'sky'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'orange'
  | 'cyan';

export interface DashboardKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description: string;
  trend?: number;
  status?: 'positive' | 'negative' | 'neutral' | 'warning';
  tone?: DashboardKpiTone;
  loading?: boolean;
}

const statusDot: Record<NonNullable<DashboardKpiCardProps['status']>, string> = {
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
  neutral: 'bg-muted-foreground/50',
  warning: 'bg-amber-500',
};

const toneStyles: Record<
  DashboardKpiTone,
  {
    card: string;
    icon: string;
    value: string;
    glow: string;
  }
> = {
  indigo: {
    card: 'border-indigo-200/60 bg-gradient-to-br from-indigo-500/[0.08] via-card to-card dark:border-indigo-500/20 dark:from-indigo-400/[0.12]',
    icon: 'bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 text-indigo-600 dark:text-indigo-400',
    value: 'text-indigo-950 dark:text-indigo-50',
    glow: 'from-indigo-400/20',
  },
  sky: {
    card: 'border-sky-200/60 bg-gradient-to-br from-sky-500/[0.08] via-card to-card dark:border-sky-500/20 dark:from-sky-400/[0.12]',
    icon: 'bg-gradient-to-br from-sky-500/20 to-sky-600/10 text-sky-600 dark:text-sky-400',
    value: 'text-sky-950 dark:text-sky-50',
    glow: 'from-sky-400/20',
  },
  emerald: {
    card: 'border-emerald-200/60 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card dark:border-emerald-500/20 dark:from-emerald-400/[0.12]',
    icon: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-950 dark:text-emerald-50',
    glow: 'from-emerald-400/20',
  },
  violet: {
    card: 'border-violet-200/60 bg-gradient-to-br from-violet-500/[0.08] via-card to-card dark:border-violet-500/20 dark:from-violet-400/[0.12]',
    icon: 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 text-violet-600 dark:text-violet-400',
    value: 'text-violet-950 dark:text-violet-50',
    glow: 'from-violet-400/20',
  },
  amber: {
    card: 'border-amber-200/60 bg-gradient-to-br from-amber-500/[0.08] via-card to-card dark:border-amber-500/20 dark:from-amber-400/[0.12]',
    icon: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400',
    value: 'text-amber-950 dark:text-amber-50',
    glow: 'from-amber-400/20',
  },
  rose: {
    card: 'border-rose-200/60 bg-gradient-to-br from-rose-500/[0.08] via-card to-card dark:border-rose-500/20 dark:from-rose-400/[0.12]',
    icon: 'bg-gradient-to-br from-rose-500/20 to-rose-600/10 text-rose-600 dark:text-rose-400',
    value: 'text-rose-950 dark:text-rose-50',
    glow: 'from-rose-400/20',
  },
  orange: {
    card: 'border-orange-200/60 bg-gradient-to-br from-orange-500/[0.08] via-card to-card dark:border-orange-500/20 dark:from-orange-400/[0.12]',
    icon: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-600 dark:text-orange-400',
    value: 'text-orange-950 dark:text-orange-50',
    glow: 'from-orange-400/20',
  },
  cyan: {
    card: 'border-cyan-200/60 bg-gradient-to-br from-cyan-500/[0.08] via-card to-card dark:border-cyan-500/20 dark:from-cyan-400/[0.12]',
    icon: 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 text-cyan-600 dark:text-cyan-400',
    value: 'text-cyan-950 dark:text-cyan-50',
    glow: 'from-cyan-400/20',
  },
};

export function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  description,
  trend,
  status = 'neutral',
  tone = 'indigo',
  loading,
}: DashboardKpiCardProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        styles.card
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-90',
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
                trend > 0
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
              )}
            >
              {trend > 0 ? <TrendingUp className='size-3' /> : <TrendingDown className='size-3' />}
              {Math.abs(trend)}%
            </span>
          ) : null}
        </div>
      </div>
      {loading ? (
        <Skeleton className='mt-3 h-8 w-20' />
      ) : (
        <p className={cn('relative mt-3 text-2xl font-semibold tabular-nums tracking-tight', styles.value)}>
          {value}
        </p>
      )}
      <p className='relative mt-1 text-sm font-medium'>{label}</p>
      <p className='text-muted-foreground relative mt-0.5 text-xs leading-relaxed'>{description}</p>
    </div>
  );
}

const skeletonTones: DashboardKpiTone[] = [
  'indigo',
  'sky',
  'emerald',
  'violet',
  'orange',
  'amber',
  'rose',
  'cyan',
];

export function DashboardKpiGridSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4'>
      {skeletonTones.map((tone, i) => (
        <div
          key={i}
          className={cn('rounded-xl border p-4 shadow-sm', toneStyles[tone].card)}
        >
          <Skeleton className='size-9 rounded-xl opacity-60' />
          <Skeleton className='mt-3 h-8 w-16 opacity-60' />
          <Skeleton className='mt-2 h-4 w-24 opacity-60' />
          <Skeleton className='mt-1 h-3 w-full opacity-60' />
        </div>
      ))}
    </div>
  );
}
