'use client';

import { useMemo, useState } from 'react';
import { CourseCard, type TeacherCourseCardData } from './course-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CourseListProps {
  courses: TeacherCourseCardData[];
  isLoading: boolean;
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' }
];

export function CourseList({ courses, isLoading }: CourseListProps) {
  const [filter, setFilter] = useState('all');

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        if (filter === 'all') return true;
        return course.status === filter;
      }),
    [courses, filter]
  );

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className='h-40 rounded-lg' />
        ))}
      </div>
    );
  }

  if (filteredCourses.length === 0) {
    return <p className='py-12 text-center text-muted-foreground'>No courses found</p>;
  }

  return (
    <div className='space-y-6'>
      <div className='flex w-fit gap-1 rounded-lg bg-muted/30 p-1'>
        {filters.map((f) => (
          <button
            key={f.id}
            type='button'
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-md px-5 py-2 text-sm transition-colors',
              filter === f.id ? 'bg-background shadow-sm' : 'hover:bg-background/60'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
        {filteredCourses.map((course, index) => (
          <CourseCard key={course.id} course={course} index={index} />
        ))}
      </div>
    </div>
  );
}
