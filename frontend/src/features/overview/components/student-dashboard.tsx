'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BookOpen,
  Calendar as CalendarIcon,
  Bell,
  CheckCircle2,
  Users,
  ChevronRight,
  Clock,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useStudentCourses } from '@/features/student-courses/api/queries';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { StudentCourseCard } from '@/features/student-courses/components/student-course-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

const performanceData = [
  { week: 'W1', score: 85 },
  { week: 'W2', score: 88 },
  { week: 'W3', score: 82 },
  { week: 'W4', score: 90 },
  { week: 'W5', score: 95 },
  { week: 'W6', score: 92 },
  { week: 'W7', score: 96 }
];

export function StudentDashboard({ user }: { user: any }) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const router = useRouter();

  const { data: coursesData, isLoading: coursesLoading } = useStudentCourses();
  const { data: announcementsData, isLoading: announcementsLoading } = useAnnouncements();

  const courses = coursesData?.offerings || [];
  const announcements = announcementsData || [];
  const totalPending = courses.reduce((acc, curr) => acc + (curr.pendingItems || 0), 0);

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
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        {/* Main Content Area */}
        <div className='lg:col-span-8 flex flex-col gap-6'>
          {/* Welcome Banner */}
          <motion.div
            variants={itemVariants}
            className='bg-slate-50 text-slate-900 rounded-2xl p-8 relative overflow-hidden shadow-sm border border-slate-200 transform transition-transform hover:scale-[1.01] duration-300 min-h-[220px] flex flex-col justify-between'
          >
            {/* Background vector accents matching Trezo style */}
            <div className='absolute top-0 right-0 opacity-40 pointer-events-none'>
              <svg
                width='300'
                height='300'
                viewBox='0 0 300 300'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <circle cx='250' cy='50' r='150' fill='#f8fafc' />
                <circle cx='250' cy='50' r='100' fill='#e2e8f0' />
              </svg>
            </div>

            <div className='relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
              <div>
                <h2 className='text-3xl font-bold tracking-tight mb-2 text-slate-800'>
                  Good Morning, {user?.full_name?.split(' ')[0] || 'Student'}!
                </h2>
                <p className='text-slate-500 font-medium max-w-md'>
                  Here's what's happening with your courses today.
                </p>
              </div>

              {/* 3D Illustration / Graphic container placeholder */}
              <div className='hidden md:flex items-center justify-end flex-1 pr-10'></div>
            </div>

            {/* Embedded info cards directly inside the banner */}
            <div className='relative z-10 flex flex-wrap gap-4 mt-8'>
              <div className='bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-200 shadow-sm min-w-[200px]'>
                <div className='bg-slate-100 text-slate-800 p-2.5 rounded-lg border border-slate-200'>
                  <FileText className='h-5 w-5' />
                </div>
                <div>
                  <div className='text-sm font-bold text-slate-800 leading-tight'>
                    {coursesLoading ? <Skeleton className='h-4 w-12' /> : `${totalPending} Due`}
                  </div>
                  <p className='text-[11px] text-slate-500 font-medium leading-tight'>
                    Action required
                  </p>
                </div>
              </div>
              <div className='bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-200 shadow-sm min-w-[200px]'>
                <div className='bg-slate-100 text-slate-600 p-2.5 rounded-lg border border-slate-200'>
                  <Bell className='h-5 w-5' />
                </div>
                <div>
                  <div className='text-sm font-bold text-slate-800 leading-tight'>
                    {announcementsLoading ? (
                      <Skeleton className='h-4 w-12' />
                    ) : (
                      `${announcements.length} Updates`
                    )}
                  </div>
                  <p className='text-[11px] text-slate-500 font-medium leading-tight'>
                    System Announcements
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* My Courses Section */}
          <motion.div variants={itemVariants}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100'>
                My Enrolled Courses
              </h3>
              <Button variant='ghost' size='sm' onClick={() => router.push('/dashboard/courses')}>
                View All
              </Button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
              {coursesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-64 w-full rounded-2xl' />
                ))
              ) : courses.length > 0 ? (
                courses.map((offering) => (
                  <StudentCourseCard key={offering.id} offering={offering} />
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

          {/* Performance Chart Split */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <motion.div variants={itemVariants} className='md:col-span-2'>
              <Card className='border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl'>
                <CardHeader className='flex flex-row items-center justify-between pb-4'>
                  <div>
                    <CardTitle className='text-lg'>Overall Performance</CardTitle>
                    <CardDescription>Average grades over the current module</CardDescription>
                  </div>
                  <Badge variant='outline' className='text-slate-800 bg-slate-100 border-slate-300'>
                    +3.4%
                  </Badge>
                </CardHeader>
                <CardContent className='h-[250px]'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart
                      data={performanceData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id='colorScore' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#1e293b' stopOpacity={0.3} />
                          <stop offset='95%' stopColor='#1e293b' stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E2E8F0' />
                      <XAxis
                        dataKey='week'
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 12 }}
                        domain={[60, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Area
                        type='monotone'
                        dataKey='score'
                        stroke='#1e293b'
                        strokeWidth={3}
                        fillOpacity={1}
                        fill='url(#colorScore)'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Today's Schedule (NEW) */}
          <motion.div variants={itemVariants}>
            <Card className='border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden'>
              <div className='h-1.5 bg-slate-800 w-full' />
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
                          className='flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group'
                          onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                        >
                          <div className='p-3 rounded-xl bg-white shadow-sm text-slate-800'>
                            <Clock className='h-5 w-5' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-bold text-slate-800 truncate'>
                              {course.courseName}
                            </p>
                            <p className='text-xs text-slate-500 font-medium'>
                              {course.nextClass.time} • {course.nextClass.location}
                            </p>
                          </div>
                          <ChevronRight className='h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors' />
                        </div>
                      ))
                  ) : (
                    <div className='col-span-full py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed text-muted-foreground text-sm'>
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
              <Card className='border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl h-full'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-lg'>My Attendance</CardTitle>
                  <CardDescription>Semester progress</CardDescription>
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
                            <span className='text-slate-800 truncate pr-4'>
                              {course.courseCode} {course.courseName}
                            </span>
                            <span className='text-slate-500'>{course.progress || 0}%</span>
                          </div>
                          <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
                            <div
                              className='h-full bg-slate-800 rounded-full'
                              style={{ width: `${course.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='text-center py-6 text-slate-400 text-xs italic'>
                        No enrollment data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Assessments */}
            <motion.div variants={itemVariants}>
              <Card className='border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl h-full'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-lg'>Upcoming Assessments</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 pt-4'>
                  {coursesLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className='h-16 w-full rounded-xl' />
                    ))
                  ) : courses.some((c: any) => c.pendingItems > 0) ? (
                    courses
                      .filter((c: any) => c.pendingItems > 0)
                      .slice(0, 3)
                      .map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className='flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer group'
                          onClick={() => router.push(`/dashboard/courses/${item.id}`)}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='p-2 rounded-lg bg-orange-50 text-orange-600'>
                              <FileText className='h-4 w-4' />
                            </div>
                            <div>
                              <p className='text-sm font-bold text-slate-800 truncate max-w-[150px]'>
                                {item.courseName}
                              </p>
                              <p className='text-xs text-slate-500 font-medium'>
                                {item.pendingItems} Pending Tasks
                              </p>
                            </div>
                          </div>
                          <ChevronRight className='h-4 w-4 text-slate-400' />
                        </div>
                      ))
                  ) : (
                    <div className='py-8 flex flex-col items-center justify-center text-center'>
                      <div className='bg-green-50 p-3 rounded-full mb-3'>
                        <CheckCircle2 className='h-6 w-6 text-green-500' />
                      </div>
                      <p className='text-sm font-bold text-slate-800'>All caught up!</p>
                      <p className='text-[11px] text-slate-500 max-w-[180px]'>
                        You have no pending assignments at the moment.
                      </p>
                    </div>
                  )}
                  <Button
                    variant='ghost'
                    className='w-full text-sm text-slate-800 font-semibold mt-auto hover:bg-slate-100'
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
          {/* Calendar Widget */}
          <motion.div variants={itemVariants}>
            <Card className='border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl'>
              <CardHeader className='pb-2 border-b border-slate-100'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <CalendarIcon className='h-5 w-5 text-slate-800' /> Due Dates
                </CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='p-4 flex justify-center'>
                  <Calendar
                    mode='single'
                    selected={date}
                    onSelect={setDate}
                    className='rounded-md border-0'
                    classNames={{
                      day_selected:
                        'bg-slate-800 text-white hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white'
                    }}
                  />
                </div>
                <div className='px-6 pb-6 space-y-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-bold text-slate-500 uppercase tracking-wider'>
                      Legend
                    </span>
                  </div>
                  <div className='flex gap-4'>
                    <div className='flex items-center gap-1.5'>
                      <div className='h-2 w-2 rounded-full bg-slate-400' />
                      <span className='text-xs text-slate-600 font-medium'>Assignment</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <div className='h-2 w-2 rounded-full bg-slate-1000' />
                      <span className='text-xs text-slate-600 font-medium'>Assignment</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Messages Area (NEW) */}
          <motion.div variants={itemVariants}>
            <Card className='border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl bg-white overflow-hidden'>
              <CardHeader className='pb-4 flex flex-row items-center justify-between border-b border-slate-50'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <div className='p-1.5 rounded-lg bg-blue-50 text-[#486eb5]'>
                    <Users className='h-4 w-4' />
                  </div>
                  Recent Messages
                </CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='divide-y divide-slate-100'>
                  {[
                    {
                      name: 'Dr. Smith',
                      text: 'The updated lab schedules are now available.',
                      time: '10:08',
                      initials: 'DS'
                    },
                    {
                      name: 'Alice (Section A)',
                      text: 'Does the binary tree need to be balanced?',
                      time: '09:25',
                      initials: 'AL'
                    }
                  ].map((msg, i) => (
                    <div
                      key={i}
                      className='p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 group'
                      onClick={() => router.push('/dashboard/chat')}
                    >
                      <div className='h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200'>
                        {msg.initials}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex justify-between mb-0.5'>
                          <span className='text-[13px] font-bold text-slate-800'>{msg.name}</span>
                          <span className='text-[10px] text-slate-400 font-medium'>{msg.time}</span>
                        </div>
                        <p className='text-[12px] text-slate-500 truncate leading-relaxed'>
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant='ghost'
                  className='w-full rounded-none border-t border-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-50 h-10'
                  onClick={() => router.push('/dashboard/chat')}
                >
                  Open All Chats
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Announcements */}
          <motion.div variants={itemVariants}>
            <Card className='border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl'>
              <CardHeader className='pb-4 flex flex-row items-center justify-between'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <Bell className='h-5 w-5 text-slate-1000' /> Announcements
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
                      className='p-3 bg-white hover:bg-slate-50 transition-colors border border-slate-200 rounded-xl group cursor-pointer'
                    >
                      <div className='flex justify-between items-start mb-1'>
                        <Badge
                          variant={announcement.important ? 'destructive' : 'secondary'}
                          className='uppercase text-[10px] tracking-wider px-2 py-0'
                        >
                          {announcement.important ? 'Important' : 'Announcement'}
                        </Badge>
                        <span className='text-[10px] text-slate-400 font-medium'>
                          {getAnnouncementTimeAgo(announcement)}
                        </span>
                      </div>
                      <p className='text-sm font-bold text-slate-800 leading-tight mt-2 line-clamp-2'>
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
