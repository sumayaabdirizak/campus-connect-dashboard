'use client';

import { cn } from '@/lib/utils';

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
      {options.map(([key, label]) => (
        <button
          key={key}
          type='button'
          onClick={() => onChange(key)}
          className={cn(
            'rounded px-2.5 py-1 font-medium transition-colors',
            value === key ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
