'use client';

import { useState } from 'react';
import { StudentCourseCard } from './course-card';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentCourseListProps {
  courses: any[];
  isLoading: boolean;
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'In Progress' },
  { id: 'completed', label: 'Completed' }
];

export function StudentCourseList({ courses, isLoading }: StudentCourseListProps) {
  const [filter, setFilter] = useState('all');

  const filteredCourses =
    courses?.filter((course) => {
      const status = course.progress >= 100 ? 'completed' : 'active';
      if (filter === 'all') return true;
      return status === filter;
    }) || [];

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className='h-44' />
        ))}
      </div>
    );
  }

  if (filteredCourses.length === 0) {
    return <p className='text-center py-12 text-muted-foreground'>No courses found</p>;
  }

  return (
    <div className='space-y-3'>
      <div className='flex gap-1 p-1 bg-muted/30 rounded-lg w-fit'>
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 text-sm rounded-md ${filter === f.id ? 'bg-background shadow-sm' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {filteredCourses.map((course, index) => (
          <StudentCourseCard key={course.id} course={course} index={index} />
        ))}
      </div>
    </div>
  );
}
