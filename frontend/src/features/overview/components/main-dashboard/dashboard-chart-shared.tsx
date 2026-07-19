'use client';

import { Skeleton } from '@/components/ui/skeleton';

export const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];
export const QUIZ_COLORS = ['#6366f1', '#94a3b8'];

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border bg-card p-4 shadow-sm'>
      <p className='mb-3 text-sm font-semibold'>{title}</p>
      {children}
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return <p className='text-muted-foreground py-10 text-center text-sm'>{message}</p>;
}

export function ChartSkeleton() {
  return <Skeleton className='h-[220px] w-full rounded-lg' />;
}
