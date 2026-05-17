'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users,
  BookOpen,
  MonitorPlay,
  MoreHorizontal,
  Building2,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const facultyData = [
  { name: 'Computer Science', value: 850 },
  { name: 'Info Systems', value: 620 },
  { name: 'Mathematics', value: 410 },
  { name: 'Physics', value: 380 },
  { name: 'Business Admin', value: 720 },
  { name: 'Engineering', value: 950 }
];

export function AdminDashboard({ user }: { user: any }) {
  const containerVariants: any = {
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

  const isDean = user?.role === 'DEAN';

  return (
    <motion.div
      variants={containerVariants}
      initial='hidden'
      animate='show'
      className='flex-1 space-y-6'
    >
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        {/* Welcome Banner */}
        <motion.div
          variants={itemVariants}
          className='lg:col-span-5 xl:col-span-6 bg-slate-50 text-slate-900 rounded-2xl p-8 relative overflow-hidden shadow-sm border border-slate-200 transform transition-transform hover:scale-[1.01] duration-300 min-h-[240px] flex flex-col justify-center'
        >
          <div className='absolute top-0 right-0 opacity-40 pointer-events-none'>
            <svg
              width='200'
              height='200'
              viewBox='0 0 200 200'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <circle cx='150' cy='50' r='100' fill='#f8fafc' />
              <circle cx='150' cy='50' r='70' fill='#e2e8f0' />
            </svg>
          </div>
          <div className='relative z-10'>
            <h2 className='text-3xl font-bold tracking-tight mb-2 text-slate-800'>
              Welcome Back, {user.full_name?.split(' ')[0] || (isDean ? 'Dean' : 'Admin')}!
            </h2>
            <p className='text-slate-500 font-medium mb-8'>
              Here is your core {isDean ? 'faculty overview' : 'system administrative overview'} for
              today.
            </p>

            <div className='flex items-center space-x-4'>
              <div className='bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-200 shadow-sm'>
                <div className='bg-slate-100 text-slate-600 p-2.5 rounded-lg border border-slate-200'>
                  <MonitorPlay className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-sm font-bold text-slate-800 leading-tight'>245</p>
                  <p className='text-[11px] text-slate-500 font-medium leading-tight'>
                    Active Sessions
                  </p>
                </div>
              </div>
              <div className='bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-200 shadow-sm'>
                <div className='bg-slate-100 text-slate-600 p-2.5 rounded-lg border border-slate-200'>
                  <BookOpen className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-sm font-bold text-slate-800 leading-tight'>48</p>
                  <p className='text-[11px] text-slate-500 font-medium leading-tight'>
                    Active Courses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <div className='lg:col-span-7 xl:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-6'>
          <motion.div variants={itemVariants} className='h-full'>
            <StatBox
              title='Total Students'
              value='3,920'
              icon={<GraduationCap className='h-5 w-5 text-slate-700' />}
              iconBg='bg-slate-100 border border-slate-200'
            />
          </motion.div>
          <motion.div variants={itemVariants} className='h-full'>
            <StatBox
              title='Departments'
              value='12'
              icon={<Building2 className='h-5 w-5 text-slate-700' />}
              iconBg='bg-slate-100 border border-slate-200'
            />
          </motion.div>
          <motion.div variants={itemVariants} className='h-full'>
            <StatBox
              title='Total Faculty'
              value='342'
              icon={<Users className='h-5 w-5 text-slate-700' />}
              iconBg='bg-slate-100 border border-slate-200'
            />
          </motion.div>
        </div>
      </div>

      {/* Chart Section */}
      <motion.div variants={itemVariants} className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <Card className='lg:col-span-2 border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden'>
          <CardHeader className='flex flex-row items-center justify-between pb-6 pt-6'>
            <CardTitle className='text-lg font-bold text-slate-800'>
              Faculty Enrollment Figures
            </CardTitle>
            <div className='text-sm font-medium text-slate-500 cursor-pointer hover:bg-slate-50 p-2 rounded-md transition-colors'>
              Current Semester ▾
            </div>
          </CardHeader>
          <CardContent className='h-[300px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={facultyData}
                layout='vertical'
                margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  horizontal={true}
                  vertical={false}
                  stroke='#E2E8F0'
                />
                <XAxis
                  type='number'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                />
                <YAxis
                  dataKey='name'
                  type='category'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey='value' fill='#475569' radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function StatBox({
  title,
  value,
  icon,
  iconBg
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <Card className='border-slate-100 shadow-sm rounded-2xl flex flex-col justify-center h-full transform transition-transform hover:scale-[1.02] duration-300'>
      <CardContent className='p-6'>
        <div className='flex items-center justify-between space-x-4'>
          <div className={`${iconBg} p-3 rounded-xl`}>{icon}</div>
        </div>
        <div className='mt-4'>
          <p className='text-sm font-semibold text-slate-500'>{title}</p>
          <h3 className='text-3xl font-bold text-slate-800 mt-1'>{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
