'use client';

import { useCallback, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  subDays,
  subMonths,
  subWeeks
} from 'date-fns';
import { toast } from 'sonner';
import type { CalendarItem, CalendarKind, CalendarView } from '@/lib/calendar/types';
import type { PersonalEvent } from '@/lib/calendar/queries/api';
import { navigateToCourseOffering } from '@/lib/course-offering-href';
import { downloadCalendarCsv, downloadCalendarIcs } from './calendar-export';
import { useCalendarItems, useCalendarRange } from './use-calendar-data';

export function useCalendarPage() {
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

  const { range, days, fromIso, toIso } = useCalendarRange(view, cursor);
  const { personalEvents, items, courses, eventsByDay, isLoading } = useCalendarItems(
    fromIso,
    toIso,
    kinds,
    hiddenCourses
  );

  const selectedItems = eventsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];

  const openItem = useCallback(
    (item: CalendarItem) => {
      if (item.kind === 'announcement') setDetailId(item.id);
      else if (item.kind === 'personal') {
        const ev = personalEvents.find((e) => e.id === item.id) ?? null;
        setEditingEvent(ev);
        setDialogDate(undefined);
        setDialogOpen(true);
      } else if (item.courseOfferingId) {
        navigateToCourseOffering(item.courseOfferingId, {
          tab: item.kind === 'quiz' ? 'quizzes' : 'assignments',
        });
      }
    },
    [personalEvents]
  );

  const openNewEvent = useCallback((date?: Date) => {
    setEditingEvent(null);
    setDialogDate(date);
    setDialogOpen(true);
  }, []);

  const label =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
        : view === 'day'
          ? format(cursor, 'EEEE, d MMMM yyyy')
          : 'Upcoming';

  return {
    view,
    setView,
    cursor,
    selectedDay,
    setSelectedDay,
    detailId,
    setDetailId,
    exporting,
    dialogOpen,
    setDialogOpen,
    editingEvent,
    dialogDate,
    kinds,
    hiddenCourses,
    days,
    items,
    eventsByDay,
    selectedItems,
    courses,
    isLoading,
    label,
    openItem,
    openNewEvent,
    goPrev: () =>
      setCursor((c) =>
        view === 'month' ? subMonths(c, 1) : view === 'week' ? subWeeks(c, 1) : subDays(c, 1)
      ),
    goNext: () =>
      setCursor((c) =>
        view === 'month' ? addMonths(c, 1) : view === 'week' ? addWeeks(c, 1) : addDays(c, 1)
      ),
    goToday: () => {
      setCursor(new Date());
      setSelectedDay(new Date());
    },
    toggleKind: (k: CalendarKind) => setKinds((prev) => ({ ...prev, [k]: !prev[k] })),
    toggleCourse: (code: string) =>
      setHiddenCourses((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
      }),
    exportIcs: async () => {
      setExporting(true);
      try {
        await downloadCalendarIcs(fromIso, toIso);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not export calendar');
      } finally {
        setExporting(false);
      }
    },
    exportCsv: () => downloadCalendarCsv(items, range.start)
  };
}
