'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarDeadlines } from '@/lib/calendar/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card';
import { Button } from '@/features/ui/components/button';
import { cn } from '@/lib/utils';
import { MonthCalendarGrid } from './month-calendar/month-calendar-grid';
import { MonthCalendarDayList } from './month-calendar/month-calendar-day-list';
import type { DeadlineRow } from './month-calendar/types';

type Props = {
  /** `featured` = dashboard month grid with event chips (like full calendar). */
  variant?: 'compact' | 'featured';
  className?: string;
};

/**
 * Month calendar: featured = chip grid; compact = day dots + selected list.
 */
export function MonthCalendar({ variant = 'compact', className }: Props) {
  const featured = variant === 'featured';
  const weekStartsOn = 0;
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewMonth.getFullYear(), viewMonth.getMonth()]
  );

  const { data } = useCalendarDeadlines(gridStart.toISOString(), gridEnd.toISOString());

  const byDay = useMemo(() => {
    const m = new Map<string, DeadlineRow[]>();
    for (const d of data?.results ?? []) {
      if (!d.deadlineAt) continue;
      const k = format(new Date(d.deadlineAt), 'yyyy-MM-dd');
      (m.get(k) ?? m.set(k, []).get(k)!).push(d);
    }
    return m;
  }, [data]);

  const selectedItems = byDay.get(format(selected, 'yyyy-MM-dd')) ?? [];

  return (
    <Card
      className={cn(
        'rounded-xl border-border',
        featured && 'h-full w-full overflow-hidden',
        className
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between gap-2 border-b border-border py-3'>
        <div className='min-w-0'>
          <CardTitle className='text-base font-semibold text-foreground'>
            {format(viewMonth, 'MMMM yyyy')}
          </CardTitle>
          <Link href='/dashboard/calendar' className='text-xs text-primary hover:underline'>
            Open full calendar
          </Link>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            aria-label='Previous month'
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            onClick={() => {
              setViewMonth(new Date());
              setSelected(new Date());
            }}
          >
            Today
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            aria-label='Next month'
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn(featured ? 'p-0 sm:p-3' : 'p-3')}>
        <MonthCalendarGrid
          days={days}
          viewMonth={viewMonth}
          selected={selected}
          byDay={byDay}
          onSelectDay={setSelected}
          size={featured ? 'lg' : 'sm'}
        />
        {!featured ? (
          <MonthCalendarDayList selected={selected} items={selectedItems} featured={false} />
        ) : (
          <div className='border-t border-border px-3 pb-3 pt-2 sm:px-0 sm:pb-0 sm:pt-3'>
            <MonthCalendarDayList selected={selected} items={selectedItems} featured={false} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
