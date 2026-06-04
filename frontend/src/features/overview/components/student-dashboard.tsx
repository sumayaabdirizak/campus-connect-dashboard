'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStudentCourses } from '@/features/student-courses/api/queries';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { MoodleCourseCard } from './moodle-course-card';
import { TimelineBlock, type TimelineItem } from './timeline-block';
import { StudentWeekCalendar } from './student-week-calendar';

type CourseFilter = 'all' | 'inprogress' | 'completed';

export function StudentDashboard({ user }: { user: { full_name?: string } }) {
  const [filter, setFilter] = useState<CourseFilter>('all');

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
      .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime())
      .slice(0, 6);
  }, [deadlineData]);

  const filteredCourses = courses.filter((c) => {
    const p = c.progress || 0;
    if (filter === 'inprogress') return p > 0 && p < 100;
    if (filter === 'completed') return p >= 100 || c.status === 'completed';
    return true;
  });

  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div className='flex-1 space-y-6'>
      {firstName && (
        <h1 className='text-xl font-semibold tracking-tight text-foreground'>
          Hi, {firstName} — here's your dashboard
        </h1>
      )}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* Main */}
        <div className='flex flex-col gap-6 lg:col-span-8'>
          <TimelineBlock items={timelineItems} loading={deadlinesLoading} />

          {/* Course overview */}
          <Card className='rounded-lg border-border'>
            <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2 border-b py-3'>
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
            </CardHeader>
            <CardContent className='pt-4'>
              {coursesLoading ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className='h-44 w-full rounded-lg' />
                  ))}
                </div>
              ) : filteredCourses.length > 0 ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {filteredCourses.map((c) => (
                    <MoodleCourseCard key={c.id} course={c} />
                  ))}
                </div>
              ) : (
                <p className='py-10 text-center text-sm text-muted-foreground'>
                  No courses to show.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='flex flex-col gap-6 lg:col-span-4'>
          <StudentWeekCalendar />

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
