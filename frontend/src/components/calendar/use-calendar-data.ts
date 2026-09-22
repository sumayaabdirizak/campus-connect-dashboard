'use client';

import { useMemo } from 'react';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { useCalendarDeadlines } from '@/lib/calendar/queries';
import { courseColor } from '@/lib/student-courses/services/course-color';
import type { CalendarItem, CalendarKind, CalendarView } from '@/lib/calendar/types';
import { deadlineToItem, personalToItem, type DeadlineRow } from './lib';
import { usePersonalEvents } from '@/lib/calendar/queries/api';
import type { CourseLegend } from './filters-popover';

export function useCalendarRange(view: CalendarView, cursor: Date) {
  const range = useMemo(() => {
    // Header row is Sun-first (WEEKDAYS in calendar-constants.ts) — the grid
    // must align to the same start-of-week, or every date lands one column
    // off from its actual weekday.
    if (view === 'month')
      return {
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
      };
    if (view === 'week')
      return {
        start: startOfWeek(cursor, { weekStartsOn: 0 }),
        end: endOfWeek(cursor, { weekStartsOn: 0 })
      };
    if (view === 'day') return { start: startOfDay(cursor), end: endOfDay(cursor) };
    return { start: startOfDay(new Date()), end: endOfDay(addDays(new Date(), 45)) };
  }, [view, cursor]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range]
  );

  return { range, days, fromIso: range.start.toISOString(), toIso: range.end.toISOString() };
}

export function useCalendarItems(
  fromIso: string,
  toIso: string,
  kinds: Record<CalendarKind, boolean>,
  hiddenCourses: Set<string>
) {
  const { data: deadlineData, isLoading: deadlinesLoading } = useCalendarDeadlines(
    fromIso,
    toIso
  );
  const { data: eventsData, isLoading: eventsLoading } = usePersonalEvents(fromIso, toIso);
  const personalEvents = eventsData?.results ?? [];

  const allItems = useMemo<CalendarItem[]>(() => {
    const deadlines = (deadlineData?.results ?? []).map(deadlineToItem);
    const personal = personalEvents.map(personalToItem);
    return [...deadlines, ...personal].filter((i) => i.startsAt);
  }, [deadlineData, personalEvents]);

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
        (i) => kinds[i.kind] && !(i.courseCode && hiddenCourses.has(i.courseCode))
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
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return m;
  }, [items]);

  return {
    personalEvents,
    items,
    courses,
    eventsByDay,
    isLoading: deadlinesLoading || eventsLoading
  };
}
