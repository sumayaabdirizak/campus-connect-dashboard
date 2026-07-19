'use client';

import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '../types';
import { EventChip } from './event-chip';
import { WEEKDAYS } from './calendar-constants';

interface MonthGridProps {
  days: Date[];
  cursor: Date;
  selectedDay: Date;
  eventsByDay: Map<string, CalendarItem[]>;
  onSelectDay: (day: Date) => void;
  onNewEvent: (day: Date) => void;
  onOpenItem: (item: CalendarItem) => void;
}

export function MonthGrid({
  days,
  cursor,
  selectedDay,
  eventsByDay,
  onSelectDay,
  onNewEvent,
  onOpenItem
}: MonthGridProps) {
  return (
    <>
      <div className='grid grid-cols-7 border-b'>
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className='px-2 py-1.5 text-center text-[11px] font-medium uppercase text-muted-foreground'
          >
            {w}
          </div>
        ))}
      </div>
      <div className='grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-auto'>
        {days.map((day) => {
          const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const selected = isSameDay(day, selectedDay);
          return (
            <div
              key={day.toISOString()}
              role='button'
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onDoubleClick={() => onNewEvent(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectDay(day);
              }}
              className={cn(
                'flex min-h-[92px] cursor-pointer flex-col border-b border-l p-1 text-left transition-colors first:border-l-0',
                selected ? 'bg-primary/5' : 'hover:bg-muted/40'
              )}
            >
              <span
                className={cn(
                  'mb-1 flex size-6 items-center justify-center self-start rounded-full text-xs tabular-nums',
                  isToday(day)
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : inMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground/40'
                )}
              >
                {format(day, 'd')}
              </span>
              <div className='flex flex-col gap-0.5'>
                {dayEvents.slice(0, 3).map((it) => (
                  <EventChip key={`${it.kind}-${it.id}`} item={it} onOpen={onOpenItem} />
                ))}
                {dayEvents.length > 3 ? (
                  <span className='px-1 text-[10px] text-muted-foreground'>
                    +{dayEvents.length - 3} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
