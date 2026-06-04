'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  BookOpen,
  FileText,
  ClipboardCheck
} from 'lucide-react';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStudentCourses } from '@/features/student-courses/api/queries';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { MoodleCourseCard } from './moodle-course-card';
import { StatCard } from './stat-card';
import { TimelineBlock, type TimelineItem } from './timeline-block';
import { MonthCalendar } from './month-calendar';

type CourseFilter = 'all' | 'inprogress' | 'completed';

export function StudentDashboard({ user }: { user: { full_name?: string } }) {
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'card' | 'list'>('card');

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
      apiClient<{ results: TimelineItem[] }>(
        `/announcements/calendar-deadlines?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      )
  });

  const timelineItems = useMemo(() => {
    const now = Date.now();
    return (deadlineData?.results ?? [])
      .filter(
        (d) =>
          (d.kind === 'assignment' || d.kind === 'quiz') &&
          d.deadlineAt &&
          new Date(d.deadlineAt).getTime() >= now
      )
      .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime());
  }, [deadlineData]);

  const filteredCourses = courses.filter((c) => {
    const p = c.progress || 0;
    const matchFilter =
      filter === 'inprogress'
        ? p > 0 && p < 100
        : filter === 'completed'
          ? p >= 100 || c.status === 'completed'
          : true;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.courseName.toLowerCase().includes(q) ||
      (c.courseCode || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const lessonsDone = courses.reduce((a, c) => a + (c.completedLessons || 0), 0);
  const lessonsTotal = courses.reduce((a, c) => a + (c.totalLessons || 0), 0);
  const overallPct = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

  const assignments = timelineItems.filter((d) => d.kind === 'assignment');
  const quizzes = timelineItems.filter((d) => d.kind === 'quiz');
  const dueThisWeek = (rows: TimelineItem[]) => {
    const end = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return rows.filter((d) => d.deadlineAt && new Date(d.deadlineAt).getTime() <= end).length;
  };

  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div className='flex-1 space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm'>
        <div>
          <h1 className='text-xl font-semibold tracking-tight text-foreground'>
            Hi{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className='text-sm text-muted-foreground'>
            {lessonsTotal > 0
              ? `${lessonsDone} of ${lessonsTotal} lessons completed across your courses`
              : 'Welcome to your dashboard'}
          </p>
        </div>
        {lessonsTotal > 0 && (
          <div className='flex items-center gap-3'>
            <div className='h-2 w-40 overflow-hidden rounded-full bg-muted'>
              <div className='h-full rounded-full bg-primary' style={{ width: `${overallPct}%` }} />
            </div>
            <span className='text-sm font-bold tabular-nums text-foreground'>{overallPct}%</span>
          </div>
        )}
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
              tone='warning'
              value={lessonsDone}
              label='Lessons'
              sublabel={`of ${lessonsTotal} completed`}
              ratio={lessonsTotal ? lessonsDone / lessonsTotal : 0}
            />
            <StatCard
              icon={FileText}
              tone='info'
              value={assignments.length}
              label='Assignments'
              sublabel={`${dueThisWeek(assignments)} due this week`}
              ratio={assignments.length ? dueThisWeek(assignments) / assignments.length : 0}
            />
            <StatCard
              icon={ClipboardCheck}
              tone='success'
              value={quizzes.length}
              label='Quizzes'
              sublabel={`${dueThisWeek(quizzes)} due this week`}
              ratio={quizzes.length ? dueThisWeek(quizzes) / quizzes.length : 0}
            />
          </>
        )}
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* Main */}
        <div className='flex flex-col gap-6 lg:col-span-8'>
          <TimelineBlock items={timelineItems} loading={deadlinesLoading} />

          {/* Course overview */}
          <Card className='rounded-lg border-border'>
            <CardHeader className='gap-3 border-b py-3'>
              <div className='flex flex-row flex-wrap items-center justify-between gap-2'>
                <CardTitle className='text-base font-semibold'>Course overview</CardTitle>
                <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
                  {(
                    [
                      ['all', 'All'],
                      ['inprogress', 'In progress'],
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
                    <Skeleton key={i} className='h-44 w-full rounded-lg' />
                  ))}
                </div>
              ) : filteredCourses.length === 0 ? (
                <p className='py-10 text-center text-sm text-muted-foreground'>No courses to show.</p>
              ) : view === 'card' ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {filteredCourses.map((c) => (
                    <MoodleCourseCard key={c.id} course={c} />
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
                              {c.courseCode} · {c.instructor?.name ?? 'Unassigned'}
                            </p>
                          </div>
                          <div className='hidden w-28 items-center gap-2 sm:flex'>
                            <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-muted'>
                              <div
                                className='h-full rounded-full'
                                style={{ width: `${c.progress || 0}%`, backgroundColor: color }}
                              />
                            </div>
                            <span className='w-8 text-right text-xs font-semibold tabular-nums text-muted-foreground'>
                              {c.progress || 0}%
                            </span>
                          </div>
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

          {/* Latest announcements */}
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
                <p className='py-4 text-center text-sm text-muted-foreground'>
                  No announcements.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
