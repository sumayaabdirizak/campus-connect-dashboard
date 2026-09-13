import type { ComponentType } from 'react';

export function StatCard({
  label,
  value,
  sub,
  icon: Icon
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className='flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-3 sm:px-4'>
      <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
        <Icon className='size-4' aria-hidden />
      </div>
      <div className='min-w-0'>
        <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
          {label}
        </p>
        <p className='text-sm font-semibold tabular-nums text-foreground'>{value}</p>
        {sub ? <p className='truncate text-xs text-muted-foreground'>{sub}</p> : null}
      </div>
    </div>
  );
}
