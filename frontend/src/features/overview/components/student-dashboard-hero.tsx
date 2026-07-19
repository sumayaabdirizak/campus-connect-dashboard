'use client';

import { BookOpen, CalendarClock, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { HeroTile, StatCard } from './stat-card';
import type { DeadlineRow } from '@/features/calendar/lib';

export function StudentDashboardHero({
  firstName,
  coursesLoading,
  deadlinesLoading,
  nextUp,
  lessonsTotal,
  overallPct,
  coursesCount,
  lessonsDone,
  assignments,
  dueThisWeek,
}: {
  firstName?: string;
  coursesLoading: boolean;
  deadlinesLoading: boolean;
  nextUp: DeadlineRow | null;
  lessonsTotal: number;
  overallPct: number;
  coursesCount: number;
  lessonsDone: number;
  assignments: DeadlineRow[];
  dueThisWeek: (rows: DeadlineRow[]) => number;
}) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {coursesLoading || deadlinesLoading ? (
        <>
          <Skeleton className='h-36 w-full rounded-2xl sm:col-span-2' />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className='h-36 w-full rounded-2xl' />
          ))}
        </>
      ) : (
        <>
          <HeroTile
            className='sm:col-span-2'
            kicker={`Hi${firstName ? ` ${firstName}` : ''} 👋 — up next`}
            title={
              nextUp
                ? nextUp.title
                : lessonsTotal > 0
                  ? `${overallPct}% of your semester done`
                  : 'All clear — nothing due'
            }
            meta={
              nextUp?.deadlineAt
                ? `${nextUp.kind === 'quiz' ? 'Quiz' : 'Assignment'} · due ${new Date(
                    nextUp.deadlineAt
                  ).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`
                : `${coursesCount} course${coursesCount === 1 ? '' : 's'} this semester`
            }
            icon={CalendarClock}
            href='/dashboard/calendar'
          />
          <StatCard
            icon={BookOpen}
            tone='warning'
            value={lessonsDone}
            label='Course items'
            sublabel={
              lessonsTotal > 0 ? `of ${lessonsTotal} completed` : `${coursesCount} courses enrolled`
            }
            ratio={lessonsTotal ? lessonsDone / lessonsTotal : 0}
            href='/dashboard/courses'
          />
          <StatCard
            icon={FileText}
            tone='info'
            value={assignments.length}
            label='Assignments'
            sublabel={`${dueThisWeek(assignments)} due this week`}
            ratio={assignments.length ? dueThisWeek(assignments) / assignments.length : 0}
            href='/dashboard/calendar'
          />
        </>
      )}
    </div>
  );
}
