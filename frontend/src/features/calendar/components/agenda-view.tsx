'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '../types';
import { KIND_LABEL } from '../types';
import { itemColor, itemLabel, fmtTime } from '../lib';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { calendarItemToDeadlineInput } from '@/features/calendar/deadline-calendar';

function dayHeading(d: Date): string {
  if (isToday(d)) return `Today · ${format(d, 'EEE d MMM')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'EEE d MMM')}`;
  return format(d, 'EEEE · d MMMM yyyy');
}

export function AgendaView({
  items,
  onOpen
}: {
  items: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
}) {
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = items
      .filter((i) => i.startsAt)
      .filter((i) =>
        query
          ? `${i.title} ${i.courseCode ?? ''}`.toLowerCase().includes(query)
          : true
      )
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      );

    const map = new Map<string, { date: Date; items: CalendarItem[] }>();
    for (const it of filtered) {
      const d = new Date(it.startsAt);
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, { date: d, items: [] });
      map.get(key)!.items.push(it);
    }
    return [...map.values()];
  }, [items, q]);

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='border-b p-3'>
        <div className='relative'>
          <Search className='text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2' />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search events and deadlines…'
            className='pl-9'
          />
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-auto p-3'>
        {groups.length === 0 ? (
          <p className='text-muted-foreground rounded-lg border bg-muted/30 px-3 py-6 text-center text-sm'>
            Nothing scheduled in this range.
          </p>
        ) : (
          <div className='space-y-5'>
            {groups.map(({ date, items: dayItems }) => (
              <div key={date.toISOString()}>
                <h3
                  className={cn(
                    'mb-2 text-xs font-semibold uppercase tracking-wide',
                    isToday(date) ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {dayHeading(date)}
                </h3>
                <div className='space-y-1.5'>
                  {dayItems.map((it) => {
                    const color = itemColor(it);
                    const deadline = calendarItemToDeadlineInput(it);
                    return (
                      <div
                        key={`${it.kind}-${it.id}`}
                        className='rounded-lg border bg-card'
                        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                      >
                        <button
                          type='button'
                          onClick={() => onOpen(it)}
                          className='flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                        >
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium text-foreground'>
                              {itemLabel(it)}
                            </p>
                            <p className='text-muted-foreground mt-0.5 text-xs'>
                              {fmtTime(it.startsAt, it.allDay)}
                            </p>
                          </div>
                          <span
                            className='shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide'
                            style={{
                              backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
                              color
                            }}
                          >
                            {KIND_LABEL[it.kind]}
                          </span>
                        </button>
                        {deadline ? (
                          <div className='border-t px-3 py-2'>
                            <AddToCalendarButton
                              deadline={deadline}
                              className='text-xs text-muted-foreground'
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
