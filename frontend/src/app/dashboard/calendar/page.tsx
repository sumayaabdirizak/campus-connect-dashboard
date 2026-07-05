'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Table as TableIcon,
  CalendarDays
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  subDays,
  subMonths,
  subWeeks,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { getAnnouncementById } from '@/features/announcements/api/service';
import type { Announcement } from '@/features/announcements/api/types';
import { AnnouncementContent } from '@/features/announcements/components/announcement-content';
import type { CalendarItem, CalendarKind, CalendarView } from '@/features/calendar/types';
import { ALL_KINDS, KIND_LABEL } from '@/features/calendar/types';
import {
  deadlineToItem,
  personalToItem,
  itemColor,
  itemTint,
  itemLabel,
  fmtTime,
  type DeadlineRow
} from '@/features/calendar/lib';
import { usePersonalEvents, type PersonalEvent } from '@/features/calendar/api';
import { AgendaView } from '@/features/calendar/components/agenda-view';
import { TimeGrid } from '@/features/calendar/components/time-grid';
import { EventDialog } from '@/features/calendar/components/event-dialog';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { calendarItemToDeadlineInput } from '@/features/calendar/deadline-calendar';
import {
  FiltersPopover,
  type CourseLegend
} from '@/features/calendar/components/filters-popover';

import { buildApiUrl } from '@/lib/api-config';

function isAllDayUtc(iso: string): boolean {
  const d = new Date(iso);
  return (
    !Number.isNaN(d.getTime()) &&
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const VIEWS: [CalendarView, string][] = [
  ['month', 'Month'],
  ['week', 'Week'],
  ['day', 'Day'],
  ['agenda', 'Agenda']
];

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalEvent | null>(null);
  const [dialogDate, setDialogDate] = useState<Date | undefined>(undefined);
  const [kinds, setKinds] = useState<Record<CalendarKind, boolean>>({
    announcement: true,
    assignment: true,
    quiz: true,
    personal: true
  });
  const [hiddenCourses, setHiddenCourses] = useState<Set<string>>(new Set());
  const router = useRouter();

  const range = useMemo(() => {
    if (view === 'month')
      return {
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
      };
    if (view === 'week')
      return {
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 })
      };
    if (view === 'day') return { start: startOfDay(cursor), end: endOfDay(cursor) };
    // agenda — a forward-looking window
    return { start: startOfDay(new Date()), end: endOfDay(addDays(new Date(), 45)) };
  }, [view, cursor]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range]
  );

  const fromIso = range.start.toISOString();
  const toIso = range.end.toISOString();

  const { data: deadlineData, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['calendar', 'deadlines', fromIso, toIso],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      )
  });
  const { data: eventsData, isLoading: eventsLoading } = usePersonalEvents(fromIso, toIso);

  const personalEvents = eventsData?.results ?? [];
  const isLoading = deadlinesLoading || eventsLoading;

  const allItems = useMemo<CalendarItem[]>(() => {
    const deadlines = (deadlineData?.results ?? []).map(deadlineToItem);
    const personal = personalEvents.map(personalToItem);
    return [...deadlines, ...personal].filter((i) => i.startsAt);
  }, [deadlineData, personalEvents]);

  // Course legend (deadlines only) — also drives the course filter.
  const courses = useMemo<CourseLegend[]>(() => {
    const seen = new Map<string, string>();
    for (const i of allItems) {
      if (i.courseCode && !seen.has(i.courseCode)) {
        seen.set(i.courseCode, courseColor(i.courseCode));
      }
    }
    return [...seen.entries()]
      .map(([code, color]) => ({ code, color }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [allItems]);

  const items = useMemo(
    () =>
      allItems.filter(
        (i) =>
          kinds[i.kind] && !(i.courseCode && hiddenCourses.has(i.courseCode))
      ),
    [allItems, kinds, hiddenCourses]
  );

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const k = format(new Date(it.startsAt), 'yyyy-MM-dd');
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    for (const list of m.values())
      list.sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      );
    return m;
  }, [items]);

  const selectedItems = eventsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];

  const { data: detailAnnouncement, isFetching: detailLoading } = useQuery({
    queryKey: ['announcements', 'detail', detailId],
    queryFn: () => getAnnouncementById(detailId!),
    enabled: detailId != null
  });
  const sheetAnnouncement: Announcement | undefined = detailAnnouncement;

  const goPrev = () =>
    setCursor((c) =>
      view === 'month' ? subMonths(c, 1) : view === 'week' ? subWeeks(c, 1) : subDays(c, 1)
    );
  const goNext = () =>
    setCursor((c) =>
      view === 'month' ? addMonths(c, 1) : view === 'week' ? addWeeks(c, 1) : addDays(c, 1)
    );
  const goToday = () => {
    setCursor(new Date());
    setSelectedDay(new Date());
  };

  const openItem = useCallback(
    (item: CalendarItem) => {
      if (item.kind === 'announcement') setDetailId(item.id);
      else if (item.kind === 'personal') {
        const ev = personalEvents.find((e) => e.id === item.id) ?? null;
        setEditingEvent(ev);
        setDialogDate(undefined);
        setDialogOpen(true);
      } else if (item.courseOfferingId)
        router.push(
          `/dashboard/courses/${item.courseOfferingId}?tab=${item.kind === 'quiz' ? 'quizzes' : 'assignments'}`
        );
    },
    [personalEvents, router]
  );

  const openNewEvent = useCallback((date?: Date) => {
    setEditingEvent(null);
    setDialogDate(date);
    setDialogOpen(true);
  }, []);

  const toggleKind = (k: CalendarKind) =>
    setKinds((prev) => ({ ...prev, [k]: !prev[k] }));
  const toggleCourse = (code: string) =>
    setHiddenCourses((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const exportIcs = useCallback(async () => {
    setExporting(true);
    try {
      const from = encodeURIComponent(fromIso);
      const to = encodeURIComponent(toIso);
      const res = await fetch(
        buildApiUrl(`/announcements/calendar-deadlines.ics?from=${from}&to=${to}`),
        { credentials: 'include' }
      );
      if (!res.ok)
        throw new Error((await res.text().catch(() => '')) || `Export failed (${res.status})`);
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
  }, [fromIso, toIso]);

  const exportCsv = useCallback(() => {
    const rows = [...items].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    if (rows.length === 0) {
      toast.error('Nothing to export in this range');
      return;
    }
    const esc = (v: string | null | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Time', 'Title', 'Course', 'Type'];
    const lines = [header.map(esc).join(',')];
    for (const it of rows) {
      const d = new Date(it.startsAt);
      lines.push(
        [
          format(d, 'yyyy-MM-dd'),
          it.allDay ? 'All day' : format(d, 'HH:mm'),
          it.title,
          it.courseCode ?? '',
          KIND_LABEL[it.kind]
        ]
          .map(esc)
          .join(',')
      );
    }
    // Prepend a BOM so Excel opens the UTF-8 table correctly.
    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `campus-deadlines-${format(range.start, 'yyyy-MM-dd')}.csv`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    toast.success('Deadline table exported');
  }, [items, range]);

  const label =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
        : view === 'day'
          ? format(cursor, 'EEEE, d MMMM yyyy')
          : 'Upcoming';

  function EventChip({ item }: { item: CalendarItem }) {
    return (
      <div
        role='button'
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          openItem(item);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            openItem(item);
          }
        }}
        title={`${KIND_LABEL[item.kind]}${item.courseCode ? ` · ${item.courseCode}` : ''} — ${fmtTime(item.startsAt, item.allDay)}`}
        className='block w-full cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
        style={{ backgroundColor: itemTint(item, 18), color: itemColor(item) }}
      >
        {itemLabel(item)}
      </div>
    );
  }

  const showSidebar = view === 'month';

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
                    {fmtTime(sheetAnnouncement.deadlineAt, isAllDayUtc(sheetAnnouncement.deadlineAt))}
                  </time>
                </p>
              )}
              {sheetAnnouncement.deadlineAt && (
                <AddToCalendarButton
                  deadline={{
                    kind: 'announcement',
                    id: sheetAnnouncement.id,
                    title: sheetAnnouncement.title,
                    due: new Date(sheetAnnouncement.deadlineAt),
                    allDay: isAllDayUtc(sheetAnnouncement.deadlineAt),
                  }}
                  className='text-xs text-muted-foreground'
                />
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

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        defaultDate={dialogDate}
      />

      {/* Selected-day agenda (month view) */}
      {showSidebar && (
        <aside className='hidden w-[280px] shrink-0 flex-col border-r md:flex'>
          <div className='border-b px-5 py-4'>
            <p className='text-sm font-semibold text-foreground'>{format(selectedDay, 'EEEE')}</p>
            <p className='text-xs text-muted-foreground'>{format(selectedDay, 'd MMMM yyyy')}</p>
          </div>
          <div className='min-h-0 flex-1 space-y-2 overflow-auto p-4'>
            {isLoading ? (
              <p className='text-xs text-muted-foreground'>Loading…</p>
            ) : selectedItems.length === 0 ? (
              <p className='rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
                Nothing on this day.
              </p>
            ) : (
              selectedItems.map((it) => {
                const deadline = calendarItemToDeadlineInput(it);
                return (
                  <div
                    key={`${it.kind}-${it.id}`}
                    className='space-y-2 rounded-lg border p-3'
                    style={{ borderLeftColor: itemColor(it), borderLeftWidth: 3 }}
                  >
                    <button
                      type='button'
                      onClick={() => openItem(it)}
                      className='block w-full text-left transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    >
                      <p className='text-sm font-medium text-foreground'>{itemLabel(it)}</p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {fmtTime(it.startsAt, it.allDay)}
                      </p>
                      <p className='mt-1 text-[11px] uppercase tracking-wide text-muted-foreground'>
                        {KIND_LABEL[it.kind]}
                      </p>
                    </button>
                    {deadline ? (
                      <AddToCalendarButton
                        deadline={deadline}
                        className='text-xs text-muted-foreground'
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
          <div className='border-t p-3'>
            <Button
              variant='outline'
              size='sm'
              className='w-full gap-1.5'
              onClick={() => openNewEvent(selectedDay)}
            >
              <Plus className='size-3.5' aria-hidden />
              New event
            </Button>
          </div>
        </aside>
      )}

      {/* Calendar */}
      <main className='flex min-h-0 flex-1 flex-col'>
        <div className='flex flex-wrap items-center gap-2 border-b px-4 py-3'>
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              aria-label='Previous'
              onClick={goPrev}
              disabled={view === 'agenda'}
            >
              <ChevronLeft className='size-4' />
            </Button>
            <Button variant='outline' size='sm' className='h-8' onClick={goToday}>
              Today
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              aria-label='Next'
              onClick={goNext}
              disabled={view === 'agenda'}
            >
              <ChevronRight className='size-4' />
            </Button>
          </div>
          <h2 className='ml-1 text-base font-semibold text-foreground'>{label}</h2>
          <div className='flex-1' />
          <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
            {VIEWS.map(([key, lbl]) => (
              <button
                key={key}
                type='button'
                onClick={() => setView(key)}
                className={cn(
                  'rounded px-2.5 py-1 font-medium transition-colors',
                  view === key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
          <FiltersPopover
            kinds={kinds}
            onToggleKind={toggleKind}
            courses={courses}
            hiddenCourses={hiddenCourses}
            onToggleCourse={toggleCourse}
          />
          <Button size='sm' className='h-8 gap-1.5' onClick={() => openNewEvent(selectedDay)}>
            <Plus className='size-3.5' aria-hidden />
            New
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='secondary' size='sm' className='h-8 gap-1.5' disabled={exporting}>
                <Download className='size-3.5' aria-hidden />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => exportCsv()}>
                <TableIcon className='mr-2 size-4' aria-hidden />
                Deadline table (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportIcs()}>
                <CalendarDays className='mr-2 size-4' aria-hidden />
                Calendar file (.ics)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Weekday header (month only) */}
        {view === 'month' && (
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
        )}

        {view === 'month' ? (
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
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => openNewEvent(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedDay(day);
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
                      <EventChip key={`${it.kind}-${it.id}`} item={it} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className='px-1 text-[10px] text-muted-foreground'>
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : view === 'agenda' ? (
          <AgendaView items={items} onOpen={openItem} />
        ) : (
          <TimeGrid
            days={view === 'day' ? [cursor] : days}
            items={items}
            onOpen={openItem}
            onSlotClick={(date) => openNewEvent(date)}
          />
        )}
      </main>
    </div>
  );
}
