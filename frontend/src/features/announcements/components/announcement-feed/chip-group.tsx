'use client';

interface ChipGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

/** Compact pill-style filter group; accessible as a radiogroup. */
export function ChipGroup({ label, value, onChange, options }: ChipGroupProps) {
  return (
    <div
      role='radiogroup'
      aria-label={label}
      className='inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5 shadow-xs'
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type='button'
            role='radio'
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              'min-h-[44px] min-w-[44px] shrink-0 rounded-full px-3 text-[11px] font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
