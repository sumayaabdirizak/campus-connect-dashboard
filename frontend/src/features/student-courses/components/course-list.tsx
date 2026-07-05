'use client';

import { StudentCourseCard, type StudentCourseCardData } from './course-card';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentCourseListProps {
  courses: StudentCourseCardData[];
  isLoading: boolean;
}

export function StudentCourseList({ courses, isLoading }: StudentCourseListProps) {
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className='h-44 rounded-xl' />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return <p className='py-12 text-center text-muted-foreground'>No courses found</p>;
  }

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
      {courses.map((course, index) => (
        <StudentCourseCard key={course.id} course={course} index={index} />
      ))}
    </div>
  );
}
