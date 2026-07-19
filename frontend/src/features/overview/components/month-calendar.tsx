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
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonthCalendarGrid } from './month-calendar/month-calendar-grid';
import { MonthCalendarDayList } from './month-calendar/month-calendar-day-list';
import type { DeadlineRow } from './month-calendar/types';

/**
 * Moodle-style month Calendar block: a month grid with event dots on days that
 * have deadlines, prev/next/today nav, and the selected day's deadlines listed
 * below. Reads the unified deadline feed for the visible range.
 */
export function MonthCalendar() {
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

  const { data } = useQuery({
    queryKey: ['calendar', 'month', gridStart.toISOString(), gridEnd.toISOString()],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(
          gridStart.toISOString()
        )}&to=${encodeURIComponent(gridEnd.toISOString())}`
      )
  });

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
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 border-b py-3'>
        <div className='min-w-0'>
          <CardTitle className='text-base font-semibold'>{format(viewMonth, 'MMMM yyyy')}</CardTitle>
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
      <CardContent className='p-3'>
        <MonthCalendarGrid
          days={days}
          viewMonth={viewMonth}
          selected={selected}
          byDay={byDay}
          onSelectDay={setSelected}
        />
        <MonthCalendarDayList selected={selected} items={selectedItems} />
      </CardContent>
    </Card>
  );
}
