'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BookOpen,
  Calendar as CalendarIcon,
  Bell,
  CheckCircle2,
  Users,
  ChevronRight,
  TrendingUp,
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

const myCourses = [
  {
    id: 1,
    name: 'Data Structures',
    code: 'CS201',
    students: 120,
    nextClass: '10:00 AM',
    progress: 65,
    color: '#1e293b'
  },
  {
    id: 2,
    name: 'Database Systems',
    code: 'CS301',
    students: 85,
    nextClass: '02:00 PM',
    progress: 40,
    color: '#3b82f6'
  },
  {
    id: 3,
    name: 'Web Engineering',
    code: 'CS401',
    students: 150,
    nextClass: 'Tomorrow',
    progress: 85,
    color: '#6366f1'
  }
];

const upcomingEvents = [
  { title: 'Publish CS201 Assignment 3', time: 'Today, 2:00 PM', type: 'publish' },
  { title: 'Grade CS301 Midterms', time: 'Tomorrow, 5:00 PM', type: 'grade' },
  { title: 'Faculty Meeting', time: 'Mon, 10:00 AM', type: 'event' }
];

const activityData = [
  { week: 'W1', grading: 12 },
  { week: 'W2', grading: 18 },
  { week: 'W3', grading: 15 },
  { week: 'W4', grading: 35 },
  { week: 'W5', grading: 40 },
  { week: 'W6', grading: 28 },
  { week: 'W7', grading: 45 }
];

export function TeacherDashboard({ user }: { user: any }) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const router = useRouter();

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
            className='bg-muted text-foreground rounded-2xl p-8 relative overflow-hidden shadow-sm border border-border transform transition-transform hover:scale-[1.01] duration-300 min-h-[220px] flex flex-col justify-between'
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
                <h2 className='text-3xl font-bold tracking-tight mb-2 text-foreground'>
                  Good Morning, {user?.full_name?.split(' ')[0] || 'Professor'}!
                </h2>
                <p className='text-muted-foreground font-medium max-w-md'>
                  Here's what's happening across your faculty today.
                </p>
              </div>

              {/* 3D Illustration container placeholder */}
              <div className='hidden md:flex items-center justify-end flex-1 pr-10'></div>
            </div>

            {/* Embedded info cards directly inside the banner */}
            <div className='relative z-10 flex flex-wrap gap-4 mt-8'>
              <div className='bg-card rounded-xl p-3 flex items-center gap-3 border border-border shadow-sm min-w-[200px]'>
                <div className='bg-muted text-foreground p-2.5 rounded-lg border border-border'>
                  <FileText className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-sm font-bold text-foreground leading-tight'>42 To Grade</p>
                  <p className='text-[11px] text-muted-foreground font-medium leading-tight'>
                    Awaiting processing
                  </p>
                </div>
              </div>
              <div className='bg-card rounded-xl p-3 flex items-center gap-3 border border-border shadow-sm min-w-[200px]'>
                <div className='bg-muted text-muted-foreground p-2.5 rounded-lg border border-border'>
                  <CheckCircle2 className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-sm font-bold text-foreground leading-tight'>3 Classes</p>
                  <p className='text-[11px] text-muted-foreground font-medium leading-tight'>
                    Scheduled today
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* My Courses Section */}
          <motion.div variants={itemVariants}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-bold tracking-tight text-foreground'>
                My Courses
              </h3>
              <Button variant='ghost' size='sm' onClick={() => router.push('/dashboard/courses')}>
                View All
              </Button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {myCourses.map((course) => (
                <Card
                  key={course.id}
                  className='border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-2xl'
                  onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                >
                  <CardContent className='p-5'>
                    <div className='flex items-center justify-between mb-4'>
                      <div
                        className='p-2.5 rounded-xl text-white shadow-sm'
                        style={{ backgroundColor: course.color }}
                      >
                        <BookOpen className='h-5 w-5' />
                      </div>
                      <Badge variant='secondary' className='bg-muted text-muted-foreground border-0'>
                        {course.code}
                      </Badge>
                    </div>
                    <h4 className='font-bold text-foreground text-lg mb-1'>{course.name}</h4>
                    <div className='flex items-center justify-between text-sm text-muted-foreground mt-4'>
                      <div className='flex items-center gap-1.5 font-medium'>
                        <Users className='h-4 w-4' /> {course.students}
                      </div>
                      <div className='text-xs font-semibold bg-muted px-2.5 py-1 rounded-md'>
                        {course.nextClass}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Chart Split */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <motion.div variants={itemVariants} className='md:col-span-2'>
              <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl'>
                <CardHeader className='flex flex-row items-center justify-between pb-4'>
                  <div>
                    <CardTitle className='text-lg'>Grading Velocity</CardTitle>
                    <CardDescription>Assignments graded per week</CardDescription>
                  </div>
                  <Badge variant='outline' className='text-foreground bg-muted border-border'>
                    +12%
                  </Badge>
                </CardHeader>
                <CardContent className='h-[250px]'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart
                      data={activityData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id='colorGrading' x1='0' y1='0' x2='0' y2='1'>
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
                        dataKey='grading'
                        stroke='#1e293b'
                        strokeWidth={3}
                        fillOpacity={1}
                        fill='url(#colorGrading)'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Attendance & Analytics Split */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <motion.div variants={itemVariants}>
              <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl h-full'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-lg'>Overall Attendance</CardTitle>
                  <CardDescription>Average across all courses</CardDescription>
                </CardHeader>
                <CardContent className='flex items-center gap-6 pt-4'>
                  <div className='relative h-24 w-24'>
                    <svg className='w-full h-full' viewBox='0 0 100 100'>
                      <circle
                        className='text-muted stroke-current'
                        strokeWidth='10'
                        cx='50'
                        cy='50'
                        r='40'
                        fill='transparent'
                      ></circle>
                      <circle
                        className='text-foreground progress-ring stroke-current'
                        strokeWidth='10'
                        strokeLinecap='round'
                        cx='50'
                        cy='50'
                        r='40'
                        fill='transparent'
                        strokeDasharray='251.2'
                        strokeDashoffset='30.14'
                      ></circle>
                    </svg>
                    <div className='absolute inset-0 flex items-center justify-center text-xl font-bold'>
                      88%
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between gap-4 text-sm'>
                      <span className='text-muted-foreground'>Present</span>
                      <span className='font-semibold text-foreground'>88%</span>
                    </div>
                    <div className='flex items-center justify-between gap-4 text-sm'>
                      <span className='text-muted-foreground'>Absent</span>
                      <span className='font-semibold text-foreground'>10%</span>
                    </div>
                    <div className='flex items-center justify-between gap-4 text-sm'>
                      <span className='text-muted-foreground'>Late</span>
                      <span className='font-semibold text-foreground'>2%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl h-full'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-lg'>Recent Assignments</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 pt-4'>
                  <div className='flex items-center justify-between p-3 bg-card hover:bg-muted transition-colors border border-border rounded-xl cursor-pointer'>
                    <div className='flex items-center gap-3'>
                      <div className='bg-muted p-2 rounded-lg text-foreground'>
                        <FileText className='h-4 w-4' />
                      </div>
                      <div>
                        <p className='text-sm font-bold text-foreground'>Midterm Web Dev</p>
                        <p className='text-xs text-muted-foreground'>CS401 • 120/150 Graded</p>
                      </div>
                    </div>
                    <span className='text-xs font-semibold text-foreground'>80%</span>
                  </div>
                  <div className='flex items-center justify-between p-3 bg-card hover:bg-muted transition-colors border border-border rounded-xl cursor-pointer'>
                    <div className='flex items-center gap-3'>
                      <div className='bg-muted p-2 rounded-lg text-muted-foreground'>
                        <CheckCircle2 className='h-4 w-4' />
                      </div>
                      <div>
                        <p className='text-sm font-bold text-foreground'>Data Normalization</p>
                        <p className='text-xs text-muted-foreground'>CS301 • Published</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className='lg:col-span-4 flex flex-col gap-6'>
          {/* Calendar Widget */}
          <motion.div variants={itemVariants}>
            <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl'>
              <CardHeader className='pb-2 border-b border-border'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <CalendarIcon className='h-5 w-5 text-foreground' /> Planner
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
                        'bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background'
                    }}
                  />
                </div>
                <div className='px-6 pb-6 space-y-4'>
                  <h4 className='text-sm font-bold text-foreground uppercase tracking-wider mb-2'>
                    Upcoming Events
                  </h4>
                  {upcomingEvents.map((ev, i) => (
                    <div key={i} className='flex gap-3'>
                      <div
                        className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${ev.type === 'publish' ? 'bg-foreground' : ev.type === 'grade' ? 'bg-muted-foreground' : 'bg-muted'}`}
                      />
                      <div>
                        <p className='text-sm font-semibold text-foreground leading-tight'>
                          {ev.title}
                        </p>
                        <p className='text-xs text-muted-foreground font-medium mt-0.5'>{ev.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Announcements */}
          <motion.div variants={itemVariants}>
            <Card className='border-border shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <Bell className='h-5 w-5 text-foreground' /> Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='p-3 bg-muted/50 rounded-xl border border-border'>
                  <div className='flex justify-between items-start mb-1'>
                    <Badge className='bg-foreground text-background hover:bg-foreground/90 border-border uppercase text-[10px] tracking-wider px-2 py-0'>
                      Urgent
                    </Badge>
                    <span className='text-[10px] text-muted-foreground font-medium'>2h ago</span>
                  </div>
                  <p className='text-sm font-bold text-foreground leading-tight mt-2'>
                    Faculty system maintenance this weekend
                  </p>
                </div>
                <div className='p-3 bg-card border border-border rounded-xl'>
                  <div className='flex justify-between items-start mb-1'>
                    <Badge
                      variant='secondary'
                      className='uppercase text-[10px] tracking-wider px-2 py-0'
                    >
                      Dept
                    </Badge>
                    <span className='text-[10px] text-muted-foreground font-medium'>1d ago</span>
                  </div>
                  <p className='text-sm font-bold text-foreground leading-tight mt-2'>
                    Submit final grades for CS101
                  </p>
                </div>
                <Button
                  variant='ghost'
                  className='w-full text-sm text-foreground font-semibold hover:bg-muted'
                >
                  View All Announcements
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
