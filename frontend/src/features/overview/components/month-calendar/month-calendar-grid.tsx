'use client';

import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthCalendarGridProps {
  days: Date[];
  viewMonth: Date;
  selected: Date;
  byDay: Map<string, unknown[]>;
  onSelectDay: (day: Date) => void;
}

export function MonthCalendarGrid({
  days,
  viewMonth,
  selected,
  byDay,
  onSelectDay
}: MonthCalendarGridProps) {
  return (
    <div className='grid grid-cols-7 gap-1 text-center'>
      {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => (
        <span key={w} className='py-1 text-[10px] font-medium uppercase text-muted-foreground'>
          {w}
        </span>
      ))}
      {days.map((day) => {
        const k = format(day, 'yyyy-MM-dd');
        const has = byDay.has(k);
        const inMonth = isSameMonth(day, viewMonth);
        const isSel = isSameDay(day, selected);
        const today = isToday(day);
        return (
          <button
            key={k}
            type='button'
            onClick={() => onSelectDay(day)}
            aria-pressed={isSel}
            aria-label={`${format(day, 'EEEE, d MMMM')}${has ? ', has deadlines' : ''}`}
            className={cn(
              'relative flex h-8 items-center justify-center rounded-md text-xs transition-colors',
              isSel
                ? 'bg-primary font-semibold text-primary-foreground'
                : today
                  ? 'font-bold text-primary hover:bg-muted'
                  : inMonth
                    ? 'text-foreground hover:bg-muted'
                    : 'text-muted-foreground/40 hover:bg-muted'
            )}
          >
            {format(day, 'd')}
            {has && (
              <span
                className={cn(
                  'absolute bottom-1 size-1 rounded-full',
                  isSel ? 'bg-primary-foreground' : 'bg-primary'
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
