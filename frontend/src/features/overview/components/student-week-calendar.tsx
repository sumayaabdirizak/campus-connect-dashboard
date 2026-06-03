'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type DeadlineKind = 'announcement' | 'assignment' | 'quiz';

interface DeadlineRow {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  deadlineAllDay?: boolean;
  courseCode?: string | null;
  courseOfferingId?: number | null;
}

const KIND_LABEL: Record<DeadlineKind, string> = {
  announcement: 'Announcement',
  assignment: 'Assignment',
  quiz: 'Quiz'
};

const MS_24H = 24 * 60 * 60 * 1000;

function within24h(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  const now = Date.now();
  return Number.isFinite(t) && t > now && t - now <= MS_24H;
}

function formatTime(iso: string | null, allDay?: boolean): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (allDay) return 'All day';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
}

/**
 * Compact "This Week" calendar + agenda for the student dashboard. Reads the
 * unified deadline feed (assignments + quizzes + announcements) and lets the
 * student scan the week and jump to anything due. Token-driven so it themes and
 * works in dark mode; mobile-friendly (the 7-day strip wraps to small cells).
 */
export function StudentWeekCalendar() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(new Date());

  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'deadlines', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(
          weekStart.toISOString()
        )}&to=${encodeURIComponent(weekEnd.toISOString())}`
      )
  });

  const deadlines = data?.results ?? [];

  const countByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of deadlines) {
      if (!d.deadlineAt) continue;
      const key = format(new Date(d.deadlineAt), 'yyyy-MM-dd');
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [deadlines]);

  const selectedDeadlines = useMemo(
    () =>
      deadlines
        .filter((d) => d.deadlineAt && isSameDay(new Date(d.deadlineAt), selectedDay))
        .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime()),
    [deadlines, selectedDay]
  );

  const openDeadline = (d: DeadlineRow) => {
    if (d.kind === 'announcement') {
      router.push('/dashboard/calendar');
    } else if (d.courseOfferingId) {
      const tab = d.kind === 'quiz' ? 'quizzes' : 'assignments';
      router.push(`/dashboard/courses/${d.courseOfferingId}?tab=${tab}`);
    }
  };

  return (
    <Card className='rounded-2xl border-border shadow-sm'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <span className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <CalendarDays className='size-4' />
          </span>
          This Week
        </CardTitle>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label='Previous week'
            onClick={() => setSelectedDay((d) => subWeeks(d, 1))}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-2 text-xs'
            onClick={() => setSelectedDay(new Date())}
          >
            Today
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label='Next week'
            onClick={() => setSelectedDay((d) => addWeeks(d, 1))}
          >
            <ChevronRight className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 gap-1 px-2 text-xs'
            onClick={() => router.push('/dashboard/calendar')}
          >
            Full
            <ArrowUpRight className='size-3.5' />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Week strip */}
        <div className='grid grid-cols-7 gap-1'>
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const count = countByDay.get(key) ?? 0;
            const selected = isSameDay(day, selectedDay);
            const today = isToday(day);
            return (
              <button
                key={key}
                type='button'
                onClick={() => setSelectedDay(day)}
                aria-pressed={selected}
                aria-label={`${format(day, 'EEEE, MMM d')}${count ? `, ${count} due` : ''}`}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-transparent hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase',
                    selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'EEEEE')}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    !selected && today && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </span>
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    count === 0
                      ? 'bg-transparent'
                      : selected
                        ? 'bg-primary-foreground'
                        : 'bg-primary'
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Agenda for the selected day */}
        <div className='space-y-2'>
          <p className='text-xs font-medium text-muted-foreground'>
            {format(selectedDay, 'EEEE, MMM d')}
          </p>
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className='h-14 w-full rounded-xl' />
            ))
          ) : selectedDeadlines.length === 0 ? (
            <div className='rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground'>
              Nothing due on this day.
            </div>
          ) : (
            selectedDeadlines.map((d) => (
              <button
                key={`${d.kind}-${d.id}`}
                type='button'
                onClick={() => openDeadline(d)}
                className='flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
              >
                <span className='w-14 shrink-0 text-xs font-semibold tabular-nums text-foreground'>
                  {formatTime(d.deadlineAt, d.deadlineAllDay)}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-foreground'>
                    {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
                  </p>
                  <div className='mt-0.5 flex items-center gap-2'>
                    <Badge variant='secondary' className='px-1.5 py-0 text-[10px]'>
                      {KIND_LABEL[d.kind]}
                    </Badge>
                    {within24h(d.deadlineAt) && (
                      <span className='text-[10px] font-semibold uppercase tracking-wide text-warning'>
                        Due soon
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
