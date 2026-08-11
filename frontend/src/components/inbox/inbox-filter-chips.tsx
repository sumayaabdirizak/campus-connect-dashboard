'use client';

import { cn } from '@/lib/utils';
import type { InboxFilter } from './inbox-helpers';

export function InboxFilterChips({
  filter,
  filters,
  onChange
}: {
  filter: InboxFilter;
  filters: { id: InboxFilter; label: string; count: number }[];
  onChange: (f: InboxFilter) => void;
}) {
  return (
    <div className='flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
      {filters.map((f) => {
        const active = filter === f.id;
        return (
          <button
            key={f.id}
            type='button'
            onClick={() => onChange(f.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'bg-[#F2F4F7] text-[#667085] hover:bg-[#E4E7EC] hover:text-[#101828]'
            )}
          >
            {f.label}
            {f.count > 0 && f.id !== 'all' ? (
              <span
                className={cn(
                  'tabular-nums',
                  active ? 'opacity-90' : 'opacity-70'
                )}
              >
                {f.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
