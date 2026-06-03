'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, FileText, ClipboardCheck, Play, ChevronRight, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStudentCourses } from '@/features/student-courses/api/queries';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { StatCard } from './stat-card';
import { StudentWeekCalendar } from './student-week-calendar';

type DeadlineKind = 'announcement' | 'assignment' | 'quiz';
interface DeadlineRow {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: number | null;
}

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const KIND_LABEL: Record<DeadlineKind, string> = {
  announcement: 'Announcement',
  assignment: 'Assignment',
  quiz: 'Quiz'
};

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } }
} as const;

export function StudentDashboard({ user }: { user: { full_name?: string } }) {
  const router = useRouter();
  const [tab, setTab] = useState<'active' | 'completed'>('active');

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

  const deadlines = useMemo(() => {
    const now = Date.now();
    return (deadlineData?.results ?? [])
      .filter((d) => d.deadlineAt && new Date(d.deadlineAt).getTime() >= now)
      .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime());
  }, [deadlineData]);

  const assignments = deadlines.filter((d) => d.kind === 'assignment');
  const quizzes = deadlines.filter((d) => d.kind === 'quiz');
  const dueThisWeek = (rows: DeadlineRow[]) => {
    const end = Date.now() + MS_WEEK;
    return rows.filter((d) => new Date(d.deadlineAt!).getTime() <= end).length;
  };

  const lessonsDone = courses.reduce((a, c) => a + (c.completedLessons || 0), 0);
  const lessonsTotal = courses.reduce((a, c) => a + (c.totalLessons || 0), 0);

  const filteredCourses = courses.filter((c) => c.status === tab);
  const resumeCourse = courses.find((c) => (c.progress ?? 0) < 100) ?? courses[0];

  const openDeadline = (d: DeadlineRow) => {
    if (d.kind === 'announcement') router.push('/dashboard/calendar');
    else if (d.courseOfferingId)
      router.push(
        `/dashboard/courses/${d.courseOfferingId}?tab=${d.kind === 'quiz' ? 'quizzes' : 'assignments'}`
      );
  };

  return (
    <motion.div initial='hidden' animate='show' className='flex-1'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* ── Main column ─────────────────────────────────────────── */}
        <div className='flex flex-col gap-6 lg:col-span-8'>
          {/* Resume bar */}
          <motion.div variants={fade}>
            {coursesLoading ? (
              <Skeleton className='h-20 w-full rounded-2xl' />
            ) : resumeCourse ? (
              <div className='flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center'>
                <span
                  className='flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm'
                  style={{ backgroundColor: courseColor(resumeCourse.courseCode) }}
                >
                  <BookOpen className='size-6' />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-semibold text-foreground'>
                    {resumeCourse.courseName}
                  </p>
                  <div className='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted'>
                    <div
                      className='h-full rounded-full'
                      style={{
                        width: `${resumeCourse.progress || 0}%`,
                        backgroundColor: courseColor(resumeCourse.courseCode)
                      }}
                    />
                  </div>
                </div>
                <span className='shrink-0 text-xs font-medium text-muted-foreground'>
                  {resumeCourse.completedLessons}/{resumeCourse.totalLessons} lessons
                </span>
                <Button asChild className='shrink-0 gap-1.5'>
                  <Link href={`/dashboard/courses/${resumeCourse.id}`}>
                    <Play className='size-4' />
                    Resume
                  </Link>
                </Button>
              </div>
            ) : null}
          </motion.div>

          {/* Status */}
          <motion.div variants={fade} className='space-y-3'>
            <h3 className='text-lg font-bold tracking-tight text-foreground'>Status</h3>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              {deadlinesLoading || coursesLoading ? (
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
          </motion.div>

          {/* My Courses */}
          <motion.div variants={fade}>
            <Card className='rounded-2xl border-border shadow-sm'>
              <CardHeader className='flex flex-row items-center justify-between gap-2'>
                <CardTitle className='text-lg'>My Courses</CardTitle>
                <div className='flex rounded-full bg-muted p-0.5'>
                  {(['active', 'completed'] as const).map((t) => (
                    <button
                      key={t}
                      type='button'
                      onClick={() => setTab(t)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                        tab === t
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className='pt-0'>
                {coursesLoading ? (
                  <div className='space-y-3'>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className='h-12 w-full rounded-xl' />
                    ))}
                  </div>
                ) : filteredCourses.length > 0 ? (
                  <ul className='divide-y divide-border'>
                    {filteredCourses.map((c) => {
                      const color = courseColor(c.courseCode);
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/dashboard/courses/${c.id}`}
                            className='group flex items-center gap-3 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                          >
                            <span
                              className='flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm'
                              style={{ backgroundColor: color }}
                            >
                              {c.courseCode?.slice(0, 2).toUpperCase() || '··'}
                            </span>
                            <div className='min-w-0 flex-1'>
                              <p className='truncate text-sm font-medium text-foreground'>
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
                            <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground' />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    No {tab} courses.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className='flex flex-col gap-6 lg:col-span-4'>
          <motion.div variants={fade}>
            <StudentWeekCalendar />
          </motion.div>

          {/* Upcoming */}
          <motion.div variants={fade}>
            <Card className='rounded-2xl border-border shadow-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-lg'>Upcoming</CardTitle>
              </CardHeader>
              <CardContent className='space-y-1 pt-0'>
                {deadlinesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className='h-12 w-full rounded-xl' />
                  ))
                ) : deadlines.length > 0 ? (
                  deadlines.slice(0, 5).map((d) => {
                    const when = d.deadlineAt ? new Date(d.deadlineAt) : null;
                    const color = courseColor(d.courseCode ?? d.title);
                    return (
                      <button
                        key={`${d.kind}-${d.id}`}
                        type='button'
                        onClick={() => openDeadline(d)}
                        className='flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                      >
                        <div className='flex w-11 shrink-0 flex-col items-center rounded-lg bg-muted py-1'>
                          <span className='text-sm font-bold tabular-nums text-foreground'>
                            {when ? format(when, 'd') : '–'}
                          </span>
                          <span className='text-[10px] uppercase text-muted-foreground'>
                            {when ? format(when, 'MMM') : ''}
                          </span>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-medium text-foreground'>
                            {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
                          </p>
                          <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                            <span className='size-2 rounded-full' style={{ backgroundColor: color }} />
                            {KIND_LABEL[d.kind]}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className='py-6 text-center text-sm text-muted-foreground'>Nothing upcoming.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Announcements (compact) */}
          {announcements.length > 0 && (
            <motion.div variants={fade}>
              <Card className='rounded-2xl border-border shadow-sm'>
                <CardHeader className='flex flex-row items-center gap-2 pb-3'>
                  <Bell className='size-4 text-muted-foreground' />
                  <CardTitle className='text-lg'>Announcements</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 pt-0'>
                  {announcements.slice(0, 3).map((a: { id: string | number; title: string }) => (
                    <Link
                      key={a.id}
                      href='/dashboard/announcements'
                      className='block rounded-xl border p-2.5 transition-colors hover:bg-muted'
                    >
                      <Badge variant='secondary' className='mb-1 px-1.5 py-0 text-[10px] uppercase'>
                        Update
                      </Badge>
                      <p className='line-clamp-2 text-sm font-medium text-foreground'>{a.title}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
