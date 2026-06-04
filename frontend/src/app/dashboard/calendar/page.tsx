'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import {
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday
} from 'date-fns';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { courseColor, courseTint } from '@/features/student-courses/lib/course-color';
import { getAnnouncementById } from '@/features/announcements/api/service';
import type { Announcement } from '@/features/announcements/api/types';
import { AnnouncementContent } from '@/features/announcements/components/announcement-content';

type DeadlineKind = 'announcement' | 'assignment' | 'quiz';
type DeadlineRow = {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  deadlineAllDay?: boolean;
  courseCode?: string | null;
  courseOfferingId?: number | null;
};

const KIND_LABEL: Record<DeadlineKind, string> = {
  announcement: 'Announcement',
  assignment: 'Assignment',
  quiz: 'Quiz'
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function fmtDeadline(deadlineAt: string | null, allDay?: boolean) {
  if (!deadlineAt) return 'No time';
  const d = new Date(deadlineAt);
  if (Number.isNaN(d.getTime())) return '—';
  return allDay
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(d);
}
function isAllDayUtc(iso: string): boolean {
  const d = new Date(iso);
  return (
    !Number.isNaN(d.getTime()) &&
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}
function seedFor(d: DeadlineRow) {
  return d.courseCode ?? d.title;
}

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  const range = useMemo(() => {
    if (view === 'month') {
      return {
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
      };
    }
    return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) };
  }, [view, cursor]);

  const days = useMemo(() => eachDayOfInterval({ start: range.start, end: range.end }), [range]);

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'deadlines', view, range.start.toISOString(), range.end.toISOString()],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(range.start.toISOString())}&to=${encodeURIComponent(range.end.toISOString())}`
      )
  });
  const deadlines = data?.results ?? [];

  const eventsByDay = useMemo(() => {
    const m = new Map<string, DeadlineRow[]>();
    for (const d of deadlines) {
      if (!d.deadlineAt) continue;
      const k = format(new Date(d.deadlineAt), 'yyyy-MM-dd');
      (m.get(k) ?? m.set(k, []).get(k)!).push(d);
    }
    for (const list of m.values())
      list.sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime());
    return m;
  }, [deadlines]);

  const selectedDeadlines = eventsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];

  const { data: detailAnnouncement, isFetching: detailLoading } = useQuery({
    queryKey: ['announcements', 'detail', detailId],
    queryFn: () => getAnnouncementById(detailId!),
    enabled: detailId != null
  });
  const sheetAnnouncement: Announcement | undefined = detailAnnouncement;

  const goPrev = () => setCursor((c) => (view === 'month' ? subMonths(c, 1) : subWeeks(c, 1)));
  const goNext = () => setCursor((c) => (view === 'month' ? addMonths(c, 1) : addWeeks(c, 1)));
  const goToday = () => {
    setCursor(new Date());
    setSelectedDay(new Date());
  };

  const openDeadline = useCallback(
    (d: DeadlineRow) => {
      if (d.kind === 'announcement') setDetailId(d.id);
      else if (d.courseOfferingId)
        router.push(
          `/dashboard/courses/${d.courseOfferingId}?tab=${d.kind === 'quiz' ? 'quizzes' : 'assignments'}`
        );
    },
    [router]
  );

  const exportIcs = useCallback(async () => {
    setExporting(true);
    try {
      const from = encodeURIComponent(range.start.toISOString());
      const to = encodeURIComponent(range.end.toISOString());
      const res = await fetch(`${API_BASE_URL}/announcements/calendar-deadlines.ics?from=${from}&to=${to}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Export failed (${res.status})`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'campus-deadlines.ics';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success('Calendar file downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not export calendar');
    } finally {
      setExporting(false);
    }
  }, [range]);

  const label = view === 'month' ? format(cursor, 'MMMM yyyy') : `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`;

  function EventChip({ d }: { d: DeadlineRow }) {
    const color = courseColor(seedFor(d));
    return (
      <button
        type='button'
        onClick={() => openDeadline(d)}
        title={`${KIND_LABEL[d.kind]}${d.courseCode ? ` · ${d.courseCode}` : ''} — ${fmtDeadline(d.deadlineAt, d.deadlineAllDay)}`}
        className='block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
        style={{ backgroundColor: courseTint(seedFor(d), 18), color }}
      >
        {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
      </button>
    );
  }

  return (
    <div className='flex h-full min-h-0 w-full min-w-0 max-w-[100vw] overflow-x-hidden rounded-xl border bg-card'>
      <Sheet open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side='right' className='w-full overflow-y-auto sm:max-w-md'>
          <SheetHeader>
            <SheetTitle>Announcement</SheetTitle>
            <SheetDescription>Deadline and full content for this announcement.</SheetDescription>
          </SheetHeader>
          {detailLoading && <p className='text-sm text-muted-foreground'>Loading…</p>}
          {!detailLoading && sheetAnnouncement && (
            <article className='mt-4 space-y-3'>
              {sheetAnnouncement.deadlineAt && (
                <p className='text-sm text-muted-foreground'>
                  Deadline:{' '}
                  <time dateTime={sheetAnnouncement.deadlineAt}>
                    {fmtDeadline(sheetAnnouncement.deadlineAt, isAllDayUtc(sheetAnnouncement.deadlineAt))}
                  </time>
                </p>
              )}
              <AnnouncementContent announcement={sheetAnnouncement} showTargetingDetails={false} />
              <Button variant='outline' size='sm' asChild>
                <Link href='/dashboard/announcements'>Open in feed</Link>
              </Button>
            </article>
          )}
          {!detailLoading && detailId != null && !sheetAnnouncement && (
            <p className='text-sm text-muted-foreground'>Could not load this announcement.</p>
          )}
        </SheetContent>
      </Sheet>

      {/* Selected-day agenda */}
      <aside className='hidden w-[280px] shrink-0 flex-col border-r md:flex'>
        <div className='border-b px-5 py-4'>
          <p className='text-sm font-semibold text-foreground'>{format(selectedDay, 'EEEE')}</p>
          <p className='text-xs text-muted-foreground'>{format(selectedDay, 'd MMMM yyyy')}</p>
        </div>
        <div className='min-h-0 flex-1 space-y-2 overflow-auto p-4'>
          {isLoading ? (
            <p className='text-xs text-muted-foreground'>Loading…</p>
          ) : selectedDeadlines.length === 0 ? (
            <p className='rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
              No deadlines for this day.
            </p>
          ) : (
            selectedDeadlines.map((d) => {
              const color = courseColor(seedFor(d));
              return (
                <button
                  key={`${d.kind}-${d.id}`}
                  type='button'
                  onClick={() => openDeadline(d)}
                  className='block w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                >
                  <p className='text-sm font-medium text-foreground'>
                    {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
                  </p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {fmtDeadline(d.deadlineAt, d.deadlineAllDay)}
                  </p>
                  <p className='mt-1 text-[11px] uppercase tracking-wide text-muted-foreground'>
                    {KIND_LABEL[d.kind]}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Calendar */}
      <main className='flex min-h-0 flex-1 flex-col'>
        <div className='flex flex-wrap items-center gap-2 border-b px-4 py-3'>
          <div className='flex items-center gap-1'>
            <Button variant='ghost' size='icon' className='size-8' aria-label='Previous' onClick={goPrev}>
              <ChevronLeft className='size-4' />
            </Button>
            <Button variant='outline' size='sm' className='h-8' onClick={goToday}>
              Today
            </Button>
            <Button variant='ghost' size='icon' className='size-8' aria-label='Next' onClick={goNext}>
              <ChevronRight className='size-4' />
            </Button>
          </div>
          <h2 className='ml-1 text-base font-semibold text-foreground'>{label}</h2>
          <div className='flex-1' />
          <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
            {(
              [
                ['month', 'Month'],
                ['week', 'Week']
              ] as const
            ).map(([key, lbl]) => (
              <button
                key={key}
                type='button'
                onClick={() => setView(key)}
                className={cn(
                  'rounded px-2.5 py-1 font-medium transition-colors',
                  view === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
          <Button variant='secondary' size='sm' className='h-8 gap-1.5' disabled={exporting} onClick={() => void exportIcs()}>
            <Download className='size-3.5' aria-hidden />
            Export
          </Button>
        </div>

        {/* Weekday header */}
        <div className='grid grid-cols-7 border-b'>
          {WEEKDAYS.map((w) => (
            <div key={w} className='px-2 py-1.5 text-center text-[11px] font-medium uppercase text-muted-foreground'>
              {w}
            </div>
          ))}
        </div>

        {view === 'month' ? (
          <div className='grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-auto'>
            {days.map((day) => {
              const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const selected = isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  type='button'
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'flex min-h-[92px] flex-col border-b border-l p-1 text-left transition-colors first:border-l-0',
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
                    {dayEvents.slice(0, 3).map((d) => (
                      <EventChip key={`${d.kind}-${d.id}`} d={d} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className='px-1 text-[10px] text-muted-foreground'>
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className='grid min-h-0 flex-1 grid-cols-7 overflow-auto'>
            {days.map((day) => {
              const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
              const selected = isSameDay(day, selectedDay);
              return (
                <div key={day.toISOString()} className='flex min-h-full flex-col border-l first:border-l-0'>
                  <button
                    type='button'
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      'border-b px-2 py-1.5 text-center text-xs transition-colors',
                      selected ? 'bg-primary/5 font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded-full tabular-nums',
                        isToday(day) ? 'bg-primary text-primary-foreground' : ''
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </button>
                  <div className='flex flex-col gap-1 p-1.5'>
                    {dayEvents.map((d) => (
                      <EventChip key={`${d.kind}-${d.id}`} d={d} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
