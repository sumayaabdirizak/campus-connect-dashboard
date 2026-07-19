'use client'

import { cn } from '@/lib/utils'
import type { Filter } from './helpers'

export function FilterChips({
  filter,
  counts,
  onChange,
}: {
  filter: Filter
  counts: { all: number; unread: number; faculty: number; clubs: number }
  onChange: (f: Filter) => void
}) {
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'faculty', label: 'Faculty', count: counts.faculty },
    { id: 'clubs', label: 'Clubs', count: counts.clubs },
  ]

  return (
    <div className='flex flex-wrap gap-1.5'>
      {filters.map((f) => {
        const active = filter === f.id
        return (
          <button
            key={f.id}
            type='button'
            onClick={() => onChange(f.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {f.label}
            {f.count > 0 && f.id !== 'all' && (
              <span className={cn('tabular-nums', active ? 'opacity-80' : 'opacity-60')}>
                {f.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
