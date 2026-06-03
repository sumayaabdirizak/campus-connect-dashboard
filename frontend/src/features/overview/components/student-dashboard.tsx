'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BookOpen,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { useStudentCourses } from '@/features/student-courses/api/queries';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { CourseTile } from './course-tile';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { DashboardHero } from './dashboard-hero';
import { StudentWeekCalendar } from './student-week-calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

type DeadlineKind = 'announcement' | 'assignment' | 'quiz';
interface DeadlineRow {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: number | null;
}

export function StudentDashboard({ user }: { user: any }) {
  const router = useRouter();

  const { data: coursesData, isLoading: coursesLoading } = useStudentCourses();
  const { data: announcementsData, isLoading: announcementsLoading } = useAnnouncements();

  const courses = coursesData?.offerings || [];
  const announcements = announcementsData || [];

  // Upcoming assessment deadlines (assignments + quizzes) from the unified feed,
  // next 30 days. Replaces the old `pendingItems` field the API never returned
  // (so the "Due" stat and this list used to always be empty).
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
  const upcomingAssessments = useMemo(() => {
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
  const dueSoonCount = useMemo(() => {
    const weekEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return upcomingAssessments.filter((d) => new Date(d.deadlineAt!).getTime() <= weekEnd).length;
  }, [upcomingAssessments]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const getAnnouncementTimeAgo = (announcement: any) => {
    const raw =
      announcement?.createdAt ??
      announcement?.created_at ??
      announcement?.updatedAt ??
      announcement?.updated_at;
    if (!raw) return 'just now';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return 'just now';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial='hidden'
      animate='show'
      className='flex-1 space-y-6'
    >
      {/* This-week calendar + agenda (real deadlines: assignments, quizzes, announcements) */}
      <motion.div variants={itemVariants}>
        <StudentWeekCalendar />
      </motion.div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        {/* Main Content Area */}
        <div className='lg:col-span-8 flex flex-col gap-6'>
          {/* Up Next hero */}
          <motion.div variants={itemVariants}>
            <DashboardHero
              userName={user?.full_name}
              nextDeadline={upcomingAssessments[0] ?? null}
              dueSoonCount={dueSoonCount}
              coursesCount={courses.length}
              updatesCount={announcements.length}
              loading={deadlinesLoading}
            />
          </motion.div>

          {/* My Courses Section */}
          <motion.div variants={itemVariants}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-bold tracking-tight text-foreground'>
                My Enrolled Courses
              </h3>
              <Button variant='ghost' size='sm' onClick={() => router.push('/dashboard/courses')}>
                View All
              </Button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
              {coursesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-40 w-full rounded-2xl' />
                ))
              ) : courses.length > 0 ? (
                courses.map((offering) => (
                  <CourseTile key={offering.id} course={offering} />
                ))
              ) : (
                <Card className='col-span-full p-8 text-center border-dashed'>
                  <p className='text-muted-foreground'>
                    You are not enrolled in any courses for the current semester.
                  </p>
                </Card>
              )}
            </div>
          </motion.div>

          {/* Today's Schedule (NEW) */}
          <motion.div variants={itemVariants}>
            <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden'>
              <div className='h-1.5 bg-primary w-full' />
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <div>
                  <CardTitle className='text-lg'>Today's Schedule</CardTitle>
                  <CardDescription>Your classes for today</CardDescription>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => router.push('/dashboard/calendar')}
                >
                  View Full
                </Button>
              </CardHeader>
              <CardContent className='pt-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {coursesLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className='h-24 w-full rounded-2xl' />
                    ))
                  ) : courses.some((c) => c.nextClass) ? (
                    courses
                      .filter((c) => c.nextClass)
                      .map((course, idx) => (
                        <div
                          key={idx}
                          className='flex items-center gap-4 p-4 bg-muted border border-border rounded-2xl hover:bg-muted/70 transition-colors cursor-pointer group'
                          onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                        >
                          <div className='p-3 rounded-xl bg-card shadow-sm text-foreground'>
                            <Clock className='h-5 w-5' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-bold text-foreground truncate'>
                              {course.courseName}
                            </p>
                            <p className='text-xs text-muted-foreground font-medium'>
                              {course.nextClass.time} • {course.nextClass.location}
                            </p>
                          </div>
                          <ChevronRight className='h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors' />
                        </div>
                      ))
                  ) : (
                    <div className='col-span-full py-8 text-center bg-muted/50 rounded-2xl border border-dashed text-muted-foreground text-sm'>
                      No classes scheduled for today
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Attendance & Assessments Split */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Visual Progress / Attendance Status */}
            <motion.div variants={itemVariants}>
              <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl h-full'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-lg'>Course Progress</CardTitle>
                  <CardDescription>Lesson completion by course</CardDescription>
                </CardHeader>
                <CardContent className='pt-4'>
                  <div className='space-y-6'>
                    {coursesLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className='space-y-2'>
                          <div className='flex justify-between'>
                            <Skeleton className='h-4 w-24' />
                            <Skeleton className='h-4 w-8' />
                          </div>
                          <Skeleton className='h-1.5 w-full rounded-full' />
                        </div>
                      ))
                    ) : courses.length > 0 ? (
                      courses.slice(0, 4).map((course: any) => (
                        <div key={course.id}>
                          <div className='flex justify-between text-[13px] font-bold mb-2'>
                            <span className='text-foreground truncate pr-4'>
                              {course.courseCode} {course.courseName}
                            </span>
                            <span className='text-muted-foreground'>{course.progress || 0}%</span>
                          </div>
                          <div className='h-1.5 w-full bg-muted rounded-full overflow-hidden'>
                            <div
                              className='h-full rounded-full'
                              style={{
                                width: `${course.progress || 0}%`,
                                backgroundColor: courseColor(course.courseCode)
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='text-center py-6 text-muted-foreground text-xs italic'>
                        No enrollment data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Assessments */}
            <motion.div variants={itemVariants}>
              <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl h-full'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-lg'>Upcoming Assessments</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 pt-4'>
                  {deadlinesLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className='h-16 w-full rounded-xl' />
                    ))
                  ) : upcomingAssessments.length > 0 ? (
                    upcomingAssessments.slice(0, 3).map((d) => (
                      <div
                        key={`${d.kind}-${d.id}`}
                        className='flex items-center justify-between p-3 bg-card hover:bg-muted rounded-xl border border-border transition-colors cursor-pointer group'
                        onClick={() =>
                          d.courseOfferingId &&
                          router.push(
                            `/dashboard/courses/${d.courseOfferingId}?tab=${d.kind === 'quiz' ? 'quizzes' : 'assignments'}`
                          )
                        }
                      >
                        <div className='flex items-center gap-3 min-w-0'>
                          <div className='p-2 rounded-lg bg-primary/10 text-primary shrink-0'>
                            <FileText className='h-4 w-4' />
                          </div>
                          <div className='min-w-0'>
                            <p className='text-sm font-bold text-foreground truncate'>
                              {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
                            </p>
                            <p className='text-xs text-muted-foreground font-medium'>
                              {d.kind === 'quiz' ? 'Quiz' : 'Assignment'} ·{' '}
                              {d.deadlineAt
                                ? formatDistanceToNow(new Date(d.deadlineAt), { addSuffix: true })
                                : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className='h-4 w-4 text-muted-foreground shrink-0' />
                      </div>
                    ))
                  ) : (
                    <div className='py-8 flex flex-col items-center justify-center text-center'>
                      <div className='bg-success-muted p-3 rounded-full mb-3'>
                        <CheckCircle2 className='h-6 w-6 text-success' />
                      </div>
                      <p className='text-sm font-bold text-foreground'>All caught up!</p>
                      <p className='text-[11px] text-muted-foreground max-w-[180px]'>
                        No assignments or quizzes due in the next 30 days.
                      </p>
                    </div>
                  )}
                  <Button
                    variant='ghost'
                    className='w-full text-sm text-foreground font-semibold mt-auto hover:bg-muted'
                    onClick={() => router.push('/dashboard/assignments')}
                  >
                    View All Assignments
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className='lg:col-span-4 flex flex-col gap-6'>
          {/* Announcements */}
          <motion.div variants={itemVariants}>
            <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl'>
              <CardHeader className='pb-4 flex flex-row items-center justify-between'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <Bell className='h-5 w-5 text-foreground' /> Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {announcementsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className='h-20 w-full rounded-xl' />
                  ))
                ) : announcements.length > 0 ? (
                  announcements.slice(0, 3).map((announcement: any) => (
                    <div
                      key={announcement.id}
                      className='p-3 bg-card hover:bg-muted transition-colors border border-border rounded-xl group cursor-pointer'
                    >
                      <div className='flex justify-between items-start mb-1'>
                        <Badge
                          variant={announcement.important ? 'destructive' : 'secondary'}
                          className='uppercase text-[10px] tracking-wider px-2 py-0'
                        >
                          {announcement.important ? 'Important' : 'Announcement'}
                        </Badge>
                        <span className='text-[10px] text-muted-foreground font-medium'>
                          {getAnnouncementTimeAgo(announcement)}
                        </span>
                      </div>
                      <p className='text-sm font-bold text-foreground leading-tight mt-2 line-clamp-2'>
                        {announcement.title}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className='text-xs text-center text-muted-foreground py-4'>
                    No recent announcements
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
