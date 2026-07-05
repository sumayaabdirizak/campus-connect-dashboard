'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  format
} from 'date-fns';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { deadlineRowToCalendarInput } from '@/features/calendar/deadline-calendar';

type DeadlineKind = 'announcement' | 'assignment' | 'quiz';
interface DeadlineRow {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Moodle-style month Calendar block: a month grid with event dots on days that
 * have deadlines, prev/next/today nav, and the selected day's deadlines listed
 * below. Reads the unified deadline feed for the visible range.
 */
export function MonthCalendar() {
  const router = useRouter();
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

  const openDeadline = (d: DeadlineRow) => {
    if (d.kind === 'announcement') router.push('/dashboard/calendar');
    else if (d.courseOfferingId)
      router.push(
        `/dashboard/courses/${d.courseOfferingId}?tab=${d.kind === 'quiz' ? 'quizzes' : 'assignments'}`
      );
  };

  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 border-b py-3'>
        <div className='min-w-0'>
          <CardTitle className='text-base font-semibold'>{format(viewMonth, 'MMMM yyyy')}</CardTitle>
          <Link
            href='/dashboard/calendar'
            className='text-xs text-primary hover:underline'
          >
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
        <div className='grid grid-cols-7 gap-1 text-center'>
          {WEEKDAYS.map((w) => (
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
                onClick={() => setSelected(day)}
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

        <div className='mt-3 space-y-1 border-t pt-3'>
          <p className='text-xs font-medium text-muted-foreground'>{format(selected, 'EEEE, d MMM')}</p>
          {selectedItems.length === 0 ? (
            <p className='py-2 text-xs text-muted-foreground'>No deadlines this day.</p>
          ) : (
            selectedItems.map((d) => {
              const deadline = deadlineRowToCalendarInput(d);
              return (
                <div
                  key={`${d.kind}-${d.id}`}
                  className='flex items-start gap-1 rounded-md p-1 transition-colors hover:bg-muted'
                >
                  <button
                    type='button'
                    onClick={() => openDeadline(d)}
                    className='flex min-w-0 flex-1 items-center gap-2 p-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                  >
                    <span
                      className='size-2 shrink-0 rounded-full'
                      style={{ backgroundColor: courseColor(d.courseCode ?? d.title) }}
                    />
                    <span className='truncate text-xs text-foreground'>
                      {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
                    </span>
                  </button>
                  {deadline ? (
                    <AddToCalendarButton
                      deadline={deadline}
                      className='shrink-0 px-1 text-[10px] text-muted-foreground'
                      label='Add'
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
