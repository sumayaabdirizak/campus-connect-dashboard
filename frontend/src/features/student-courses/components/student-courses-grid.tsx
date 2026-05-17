'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Filter, BookOpen } from 'lucide-react';
import { StudentCourseCard } from './student-course-card';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentCoursesGridProps {
  courses: any[] | undefined;
  isLoading: boolean;
}

export function StudentCoursesGrid({ courses, isLoading }: StudentCoursesGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses?.filter(
    (offering) =>
      offering.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offering.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='space-y-4'>
            <Skeleton className='h-48 w-full rounded-xl' />
            <Skeleton className='h-10 w-3/4' />
            <Skeleton className='h-20 w-full' />
          </div>
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'>
        <div className='p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4'>
          <BookOpen className='h-12 w-12 text-blue-600 dark:text-blue-400' />
        </div>
        <h3 className='text-xl font-bold text-slate-900 dark:text-white mb-2'>
          You are not enrolled in any courses this term.
        </h3>
        <p className='text-muted-foreground text-center max-w-sm'>
          Please contact your department dean or the registration office if you believe this is an
          error.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <div className='flex flex-col md:flex-row gap-4 mb-6'>
        <select
          className='px-5 py-3 rounded-xl bg-white border border-slate-100/60 shadow-sm text-sm font-semibold text-slate-700 outline-none w-full md:w-32 hover:border-slate-200 cursor-pointer transition-colors appearance-none'
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right .7rem top 50%',
            backgroundSize: '.65rem auto'
          }}
        >
          <option>All</option>
          <option>Active</option>
          <option>Completed</option>
        </select>

        <div className='relative flex-1'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-300 pointer-events-none' />
          <Input
            placeholder='Search courses...'
            className='w-full pl-11 pr-4 py-6 rounded-xl border-slate-100/60 bg-white placeholder:text-slate-400 placeholder:font-medium shadow-sm focus-visible:ring-slate-200 outline-none hover:border-slate-200 transition-colors'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className='px-5 py-3 rounded-xl bg-white border border-slate-100/60 shadow-sm text-sm font-semibold text-slate-700 outline-none w-full md:w-56 hover:border-slate-200 cursor-pointer transition-colors appearance-none'
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right .7rem top 50%',
            backgroundSize: '.65rem auto'
          }}
        >
          <option>Sort by course name</option>
          <option>Sort by progress</option>
        </select>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        {filteredCourses?.map((offering) => (
          <StudentCourseCard key={offering.id} offering={offering} />
        ))}
      </div>
    </div>
  );
}
