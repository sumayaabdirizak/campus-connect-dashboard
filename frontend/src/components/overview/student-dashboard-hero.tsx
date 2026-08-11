'use client'

import { BookOpen, CalendarClock, FileText } from 'lucide-react'
import { Skeleton } from '@/features/ui/components/skeleton'
import { HeroTile, StatCard } from './stat-card'
import type { DeadlineRow } from '@/components/calendar/lib'

/** C3 — same HeroTile / StatCard language as teacher dashboard. */
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
  firstName?: string
  coursesLoading: boolean
  deadlinesLoading: boolean
  nextUp: DeadlineRow | null
  lessonsTotal: number
  overallPct: number
  coursesCount: number
  lessonsDone: number
  assignments: DeadlineRow[]
  dueThisWeek: (rows: DeadlineRow[]) => number
}) {
  const weekDue = dueThisWeek(assignments)

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
            kicker={`Hi${firstName ? ` ${firstName}` : ''} — up next`}
            title={
              nextUp
                ? nextUp.title || 'Untitled'
                : lessonsTotal > 0
                  ? `${overallPct}% of your semester done`
                  : 'All clear — nothing due'
            }
            meta={
              nextUp?.deadlineAt
                ? `${nextUp.kind === 'quiz' ? 'Quiz' : 'Assignment'} · due ${new Date(
                    nextUp.deadlineAt
                  ).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}`
                : `${coursesCount} course${coursesCount === 1 ? '' : 's'} this semester`
            }
            icon={CalendarClock}
            href='/dashboard/calendar'
          />
          <StatCard
            icon={BookOpen}
            tone='primary'
            value={lessonsDone}
            label='Course items'
            sublabel={
              lessonsTotal > 0 ? `of ${lessonsTotal} completed` : `${coursesCount} enrolled`
            }
            ratio={lessonsTotal ? lessonsDone / lessonsTotal : 0}
            href='/dashboard/courses'
          />
          <StatCard
            icon={FileText}
            tone='warning'
            value={weekDue}
            label='Due this week'
            sublabel={`${assignments.length} assignments ahead`}
            ratio={assignments.length ? weekDue / assignments.length : 0}
            href='/dashboard/calendar'
          />
        </>
      )}
    </div>
  )
}

