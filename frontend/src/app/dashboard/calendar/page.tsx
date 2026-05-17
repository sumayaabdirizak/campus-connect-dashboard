'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download } from 'lucide-react';
import { addWeeks, subWeeks, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
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
import { getAnnouncementById } from '@/features/announcements/api/service';
import type { Announcement } from '@/features/announcements/api/types';
import { AnnouncementContent } from '@/features/announcements/components/announcement-content';

type DeadlineRow = {
  id: number;
  title: string;
  deadlineAt: string | null;
  deadlineAllDay?: boolean;
  targetType: string;
};

const TODAY = new Date();
const MS_24H = 24 * 60 * 60 * 1000;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function formatDeadlineInUserLocale(deadlineAt: string | null, allDay: boolean | undefined) {
  if (!deadlineAt) return 'No time';
  const d = new Date(deadlineAt);
  if (Number.isNaN(d.getTime())) return '—';
  if (allDay) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

function isAnnouncementDeadlineAllDayUtc(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

function isDeadlineWithin24h(deadlineAt: string | null): boolean {
  if (!deadlineAt) return false;
  const end = new Date(deadlineAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(end) || end <= now) return false;
  return end - now <= MS_24H;
}

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: weekEnd
  });

  const { data: deadlinePayload, isLoading } = useQuery({
    queryKey: ['calendar', 'announcement-deadlines', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(weekStart.toISOString())}&to=${encodeURIComponent(weekEnd.toISOString())}`
      )
  });

  const { data: detailAnnouncement, isFetching: detailLoading } = useQuery({
    queryKey: ['announcements', 'detail', detailId],
    queryFn: () => getAnnouncementById(detailId!),
    enabled: detailId != null
  });

  const deadlines = deadlinePayload?.results ?? [];

  const selectedDayDeadlines = useMemo(
    () =>
      deadlines.filter((d) => d.deadlineAt && isSameDay(new Date(d.deadlineAt), selectedDay)),
    [deadlines, selectedDay]
  );

  const exportIcs = useCallback(async () => {
    setExporting(true);
    try {
      const from = encodeURIComponent(weekStart.toISOString());
      const to = encodeURIComponent(weekEnd.toISOString());
      const url = `${API_BASE_URL}/announcements/calendar-deadlines.ics?from=${from}&to=${to}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `Export failed (${res.status})`);
      }
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
  }, [weekEnd, weekStart]);

  const sheetAnnouncement: Announcement | undefined = detailAnnouncement;

  return (
    <div className='flex h-full min-h-0 w-full max-w-[100vw] min-w-0 overflow-x-hidden rounded-xl border bg-background'>
      <Sheet
        open={detailId != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <SheetContent side='right' className='w-full overflow-y-auto sm:max-w-md'>
          <SheetHeader>
            <SheetTitle>Announcement</SheetTitle>
            <SheetDescription>Deadline and full content for this announcement.</SheetDescription>
          </SheetHeader>
          {detailLoading && <p className='text-sm text-muted-foreground'>Loading…</p>}
          {!detailLoading && sheetAnnouncement && (
            <article className='mt-4 space-y-3' aria-busy={detailLoading}>
              {sheetAnnouncement.deadlineAt ? (
                <p className='text-sm text-muted-foreground'>
                  Deadline:{' '}
                  <time dateTime={sheetAnnouncement.deadlineAt}>
                    {formatDeadlineInUserLocale(
                      sheetAnnouncement.deadlineAt,
                      isAnnouncementDeadlineAllDayUtc(sheetAnnouncement.deadlineAt)
                    )}
                  </time>
                </p>
              ) : null}
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

      <aside className='w-[300px] border-r bg-background'>
        <div className='border-b px-5 py-4'>
          <div className='mb-2 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-foreground'>{format(selectedDay, 'MMMM yyyy')}</h2>
            <div className='flex gap-1'>
              <button
                type='button'
                onClick={() => setSelectedDay((d) => subWeeks(d, 1))}
                className='rounded p-1 hover:bg-muted'
                aria-label='Previous week'
              >
                <ChevronLeft className='h-4 w-4 text-muted-foreground' />
              </button>
              <button
                type='button'
                onClick={() => setSelectedDay((d) => addWeeks(d, 1))}
                className='rounded p-1 hover:bg-muted'
                aria-label='Next week'
              >
                <ChevronRight className='h-4 w-4 text-muted-foreground' />
              </button>
            </div>
          </div>
          <p className='text-xs text-muted-foreground'>Announcement deadlines</p>
        </div>

        <div className='space-y-2 p-4'>
          <p className='text-xs font-medium text-muted-foreground'>{format(selectedDay, 'EEEE, MMM d')}</p>
          {isLoading && <p className='text-xs text-muted-foreground'>Loading deadlines…</p>}
          {!isLoading && selectedDayDeadlines.length === 0 && (
            <p className='rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
              No announcement deadlines for this day.
            </p>
          )}
          {selectedDayDeadlines.map((d) => (
            <button
              key={d.id}
              type='button'
              className='w-full rounded-lg border bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
              onClick={() => setDetailId(d.id)}
            >
              <div className='flex items-start justify-between gap-2'>
                <p className='text-sm font-medium text-foreground'>{d.title}</p>
                {isDeadlineWithin24h(d.deadlineAt) ? (
                  <span
                    className='shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200'
                    aria-label='Due within 24 hours'
                  >
                    24h
                  </span>
                ) : null}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                {formatDeadlineInUserLocale(d.deadlineAt, d.deadlineAllDay)}
              </p>
              <p className='mt-1 text-[11px] uppercase tracking-wide text-muted-foreground'>{d.targetType}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className='flex min-h-0 flex-1 flex-col'>
        <div className='flex flex-wrap items-center gap-2 border-b px-6 py-4'>
          <button
            type='button'
            className='rounded border px-2 py-1 hover:bg-muted'
            onClick={() => setSelectedDay((d) => subWeeks(d, 1))}
            aria-label='Previous week'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button
            type='button'
            className='rounded border px-3 py-1 text-sm hover:bg-muted'
            onClick={() => setSelectedDay(new Date())}
          >
            Today
          </button>
          <button
            type='button'
            className='rounded border px-2 py-1 hover:bg-muted'
            onClick={() => setSelectedDay((d) => addWeeks(d, 1))}
            aria-label='Next week'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
          <div className='ml-2 flex items-center gap-2 rounded border px-3 py-1 text-sm'>
            <CalendarIcon className='h-4 w-4' />
            Deadlines
          </div>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='ml-1 gap-1.5'
            disabled={exporting}
            onClick={() => void exportIcs()}
          >
            <Download className='h-3.5 w-3.5' aria-hidden />
            Export .ics
          </Button>
          <div className='flex-1' />
          <span className='text-xs text-muted-foreground'>{deadlines.length} this week</span>
        </div>

        <div className='flex min-h-0 flex-1 overflow-auto'>
          {weekDays.map((day) => {
            const dayEvents = deadlines.filter(
              (d) => d.deadlineAt && isSameDay(new Date(d.deadlineAt), day)
            );
            return (
              <div key={day.toISOString()} className='min-h-full flex-1 border-l p-2'>
                <button
                  type='button'
                  onClick={() => setSelectedDay(day)}
                  className={`mb-2 w-full rounded px-2 py-1 text-left text-xs ${
                    isSameDay(day, selectedDay) ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div>{format(day, 'd')}</div>
                </button>
                <div className='space-y-2'>
                  {dayEvents.map((d) => (
                    <button
                      key={d.id}
                      type='button'
                      className='w-full rounded bg-primary/10 px-2 py-1.5 text-left text-xs text-primary transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                      onClick={() => setDetailId(d.id)}
                    >
                      <div className='flex items-start justify-between gap-1'>
                        <p className='truncate font-medium'>{d.title}</p>
                        {isDeadlineWithin24h(d.deadlineAt) ? (
                          <span
                            className='shrink-0 rounded bg-amber-500/20 px-1 py-px text-[9px] font-bold uppercase text-amber-900 dark:text-amber-100'
                            aria-label='Due within 24 hours'
                          >
                            24h
                          </span>
                        ) : null}
                      </div>
                      <p className='text-[11px] opacity-80'>
                        {d.deadlineAt ? formatDeadlineInUserLocale(d.deadlineAt, d.deadlineAllDay) : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
