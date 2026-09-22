'use client';

import { BookOpen, CalendarClock, ClipboardCheck } from 'lucide-react';
import { Skeleton } from '@/features/ui/components/skeleton';
import { HeroTile, StatCard } from './stat-card';

export function TeacherDashboardHero({
  loading,
  firstName,
  pendingGrading,
  coursesCount,
  totalStudents,
  activeCourses,
  dueThisWeek,
  timelineCount,
}: {
  loading: boolean;
  firstName?: string;
  pendingGrading: number;
  coursesCount: number;
  totalStudents: number;
  activeCourses: number;
  dueThisWeek: number;
  timelineCount: number;
}) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {loading ? (
        <>
          <Skeleton className='h-36 w-full rounded-xl sm:col-span-2' />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className='h-36 w-full rounded-xl' />
          ))}
        </>
      ) : (
        <>
          <HeroTile
            className='sm:col-span-2'
            kicker={`Hi${firstName ? ` ${firstName}` : ''} 👋 — needs your attention`}
            title={
              pendingGrading > 0
                ? `${pendingGrading} submission${pendingGrading === 1 ? '' : 's'} to grade`
                : 'All caught up on grading'
            }
            meta={
              coursesCount > 0
                ? `Teaching ${coursesCount} ${coursesCount === 1 ? 'course' : 'courses'} · ${totalStudents} students`
                : 'Welcome to your teaching dashboard'
            }
            icon={ClipboardCheck}
            href='/dashboard/courses'
          />
          <StatCard
            icon={BookOpen}
            tone='primary'
            value={coursesCount}
            label='Courses'
            sublabel={`${activeCourses} active`}
            ratio={coursesCount ? activeCourses / coursesCount : 0}
            href='/dashboard/courses'
          />
          <StatCard
            icon={CalendarClock}
            tone='warning'
            value={dueThisWeek}
            label='Due this week'
            sublabel={`${timelineCount} upcoming`}
            ratio={timelineCount ? dueThisWeek / timelineCount : 0}
            href='/dashboard/calendar'
          />
        </>
      )}
    </div>
  );
}
