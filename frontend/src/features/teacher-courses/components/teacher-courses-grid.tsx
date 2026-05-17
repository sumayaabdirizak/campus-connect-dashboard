'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { TeacherCourseCard } from './teacher-course-card';
import { Search, SlidersHorizontal } from 'lucide-react';

interface TeacherCoursesGridProps {
  courses: any[];
  isLoading: boolean;
}

export function TeacherCoursesGrid({ courses, isLoading }: TeacherCoursesGridProps) {
  const [search, setSearch] = useState('');

  const filteredCourses = courses?.filter(
    (course) =>
      course.courseName.toLowerCase().includes(search.toLowerCase()) ||
      course.courseCode.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='h-80 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse' />
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          <option>Sort by recent</option>
          <option>Sort by pending</option>
        </select>
      </div>

      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {filteredCourses?.map((offering) => (
          <TeacherCourseCard key={offering.id} offering={offering} />
        ))}
        {filteredCourses?.length === 0 && (
          <div className='col-span-full py-20 text-center'>
            <h3 className='text-xl font-semibold text-muted-foreground'>No courses found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
