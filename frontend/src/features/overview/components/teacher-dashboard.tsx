'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Users,
  BookOpen,
  CalendarClock
} from 'lucide-react';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTeacherCourses } from '@/features/teacher-courses/api/queries';
import type { Course } from '@/features/teacher-courses/api/types';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { TeacherCourseTile } from './teacher-course-tile';
import { StatCard } from './stat-card';
import { MonthCalendar } from './month-calendar';
import { filterUpcomingDeadlines } from '@/features/calendar/deadline-calendar';
import type { DeadlineRow } from '@/features/calendar/lib';

type CourseFilter = 'all' | 'active' | 'completed';

export function TeacherDashboard({ user }: { user: { full_name?: string } }) {
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'card' | 'list'>('card');

  const { data: coursesData, isLoading: coursesLoading } = useTeacherCourses();
  const { data: announcementsData } = useAnnouncements();
  const courses = (coursesData ?? []) as Course[];
  const announcements = announcementsData ?? [];

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    return {
      fromIso: now.toISOString(),
      toIso: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }, []);
  const { data: deadlineData, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['calendar', 'deadlines', 'teacher-dashboard', fromIso],
    queryFn: () =>
      apiClient<{ results: DeadlineRow[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      )
  });

  const timelineItems = useMemo(
    () => filterUpcomingDeadlines(deadlineData?.results),
    [deadlineData]
  );

  const filteredCourses = courses.filter((c) => {
    const matchFilter =
      filter === 'active'
        ? c.status === 'active'
        : filter === 'completed'
          ? c.status === 'completed' || c.status === 'archived'
          : true;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.courseName.toLowerCase().includes(q) ||
      (c.courseCode || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const totalStudents = courses.reduce((a, c) => a + (c.totalStudents || 0), 0);
  const activeCourses = courses.filter((c) => c.status === 'active').length;
  const dueThisWeek = timelineItems.filter(
    (d) => d.deadlineAt && new Date(d.deadlineAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
  ).length;
  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div className='flex-1 space-y-6'>
      {/* Header summary */}
      <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground shadow-sm'>
        <div
          className='pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-primary-foreground/10 blur-3xl'
          aria-hidden
        />
        <div className='relative'>
          <h1 className='text-xl font-bold tracking-tight'>
            Hi{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className='text-sm text-primary-foreground/80'>
            {courses.length > 0
              ? `Teaching ${courses.length} ${courses.length === 1 ? 'course' : 'courses'} · ${totalStudents} students`
              : 'Welcome to your teaching dashboard'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        {coursesLoading || deadlinesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-32 w-full rounded-2xl' />
          ))
        ) : (
          <>
            <StatCard
              icon={BookOpen}
              tone='primary'
              value={courses.length}
              label='Courses'
              sublabel={`${activeCourses} active`}
              ratio={courses.length ? activeCourses / courses.length : 0}
            />
            <StatCard icon={Users} tone='info' value={totalStudents} label='Students' sublabel='enrolled' />
            <StatCard
              icon={CalendarClock}
              tone='warning'
              value={dueThisWeek}
              label='Due this week'
              sublabel={`${timelineItems.length} upcoming`}
              ratio={timelineItems.length ? dueThisWeek / timelineItems.length : 0}
            />
          </>
        )}
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* Main */}
        <div className='flex flex-col gap-6 lg:col-span-8'>
          {/* My courses */}
          <Card className='rounded-lg border-border'>
            <CardHeader className='gap-3 border-b py-3'>
              <div className='flex flex-row flex-wrap items-center justify-between gap-2'>
                <CardTitle className='text-base font-semibold'>My courses</CardTitle>
                <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
                  {(
                    [
                      ['all', 'All'],
                      ['active', 'Active'],
                      ['completed', 'Completed']
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type='button'
                      onClick={() => setFilter(key)}
                      className={cn(
                        'rounded px-2.5 py-1 font-medium transition-colors',
                        filter === key
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <div className='relative flex-1'>
                  <Search className='absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search courses...'
                    className='h-8 pl-8 text-sm'
                  />
                </div>
                <div className='flex rounded-md border p-0.5'>
                  <button
                    type='button'
                    onClick={() => setView('card')}
                    aria-label='Card view'
                    aria-pressed={view === 'card'}
                    className={cn(
                      'rounded p-1.5 transition-colors',
                      view === 'card' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <LayoutGrid className='size-4' />
                  </button>
                  <button
                    type='button'
                    onClick={() => setView('list')}
                    aria-label='List view'
                    aria-pressed={view === 'list'}
                    className={cn(
                      'rounded p-1.5 transition-colors',
                      view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <ListIcon className='size-4' />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='pt-4'>
              {coursesLoading ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className='h-40 w-full rounded-lg' />
                  ))}
                </div>
              ) : filteredCourses.length === 0 ? (
                <p className='py-10 text-center text-sm text-muted-foreground'>No courses to show.</p>
              ) : view === 'card' ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {filteredCourses.map((c) => (
                    <TeacherCourseTile key={c.id} course={c} />
                  ))}
                </div>
              ) : (
                <ul className='divide-y divide-border'>
                  {filteredCourses.map((c) => {
                    const color = courseColor(c.courseCode);
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/dashboard/courses/${c.id}`}
                          className='group flex items-center gap-3 py-3 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                        >
                          <span
                            className='flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white'
                            style={{ backgroundColor: color }}
                          >
                            {c.courseCode?.slice(0, 2).toUpperCase() || '··'}
                          </span>
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium text-primary group-hover:underline'>
                              {c.courseName}
                            </p>
                            <p className='truncate text-xs text-muted-foreground'>
                              {c.courseCode}
                              {c.section ? ` · ${c.section}` : ''}
                            </p>
                          </div>
                          <span className='hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex'>
                            <Users className='size-3.5' />
                            {c.totalStudents}
                          </span>
                          <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='flex flex-col gap-6 lg:col-span-4'>
          <MonthCalendar />

          <Card className='rounded-lg border-border'>
            <CardHeader className='flex flex-row items-center gap-2 border-b py-3'>
              <Bell className='size-4 text-muted-foreground' />
              <CardTitle className='text-base font-semibold'>Latest announcements</CardTitle>
            </CardHeader>
            <CardContent className='pt-3'>
              {announcements.length > 0 ? (
                <ul className='divide-y divide-border'>
                  {announcements
                    .slice(0, 4)
                    .map((a: { id: string | number; title: string }) => (
                      <li key={a.id}>
                        <Link
                          href='/dashboard/announcements'
                          className='flex items-start gap-2 py-2.5 transition-colors hover:bg-muted/40'
                        >
                          <Badge
                            variant='secondary'
                            className='mt-0.5 shrink-0 px-1.5 py-0 text-[10px] uppercase'
                          >
                            New
                          </Badge>
                          <span className='line-clamp-2 text-sm text-primary hover:underline'>
                            {a.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className='py-4 text-center text-sm text-muted-foreground'>No announcements.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
