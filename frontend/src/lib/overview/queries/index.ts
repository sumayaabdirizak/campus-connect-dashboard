'use client';

import { useMemo } from 'react';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { useStudentCourses } from '@/lib/student-courses/queries';
import { useAnnouncements } from '@/lib/announcements/queries';
import { filterUpcomingDeadlines } from '@/components/calendar/deadline-calendar';
import type { DeadlineRow } from '@/components/calendar/lib';

export type CourseFilter = 'all' | 'inprogress' | 'completed';

export function useStudentDashboardData() {
  const { data: coursesData, isLoading: coursesLoading } = useStudentCourses();
  const { data: announcementsData } = useAnnouncements();
  const courses = coursesData?.offerings ?? [];
  const announcements = announcementsData ?? [];

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    return {
      fromIso: now.toISOString(),
      toIso: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }, []);

  const { data: deadlineData, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['calendar', 'deadlines', 'dashboard', fromIso],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      )
  });

  const timelineItems = useMemo(
    () => filterUpcomingDeadlines(deadlineData?.results),
    [deadlineData]
  );

  const lessonsDone = courses.reduce((a, c) => a + (c.completedLessons || 0), 0);
  const lessonsTotal = courses.reduce((a, c) => a + (c.totalLessons || 0), 0);
  const overallPct = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

  const assignments = timelineItems.filter((d) => d.kind === 'assignment');
  const quizzes = timelineItems.filter((d) => d.kind === 'quiz');

  const dueThisWeek = (rows: DeadlineRow[]) => {
    const end = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return rows.filter((d) => d.deadlineAt && new Date(d.deadlineAt).getTime() <= end).length;
  };

  const nextUp = timelineItems[0] ?? null;

  return {
    courses,
    announcements,
    coursesLoading,
    deadlinesLoading,
    timelineItems,
    lessonsDone,
    lessonsTotal,
    overallPct,
    assignments,
    quizzes,
    dueThisWeek,
    nextUp,
  };
}

