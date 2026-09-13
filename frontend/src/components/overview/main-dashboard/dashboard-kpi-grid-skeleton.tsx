import { Skeleton } from '@/features/ui/components/skeleton';
import { cn } from '@/lib/utils';
import { toneStyles, type DashboardKpiTone } from './dashboard-kpi-styles';

const skeletonTones: DashboardKpiTone[] = [
  'indigo',
  'sky',
  'emerald',
  'violet',
  'orange',
  'amber',
  'rose',
  'cyan'
];

export function DashboardKpiGridSkeleton() {
  return (
    <div className='grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4'>
      {skeletonTones.map((tone, i) => (
        <div
          key={i}
          className={cn('min-h-40 border-b border-r border-border p-5', toneStyles[tone].card)}
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
