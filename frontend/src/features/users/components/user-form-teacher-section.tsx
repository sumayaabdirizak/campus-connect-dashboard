'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function UserFormTeacherSection({
  courseIds,
  onToggleCourse,
  courses,
}: {
  courseIds: string[];
  onToggleCourse: (courseId: string) => void;
  courses: Array<{ id: number; code: string; name: string }>;
}) {
  return (
    <div className='space-y-4 mt-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50'>
      <h4 className='text-sm font-semibold'>Teacher Course Assignments</h4>

      <div className='space-y-3'>
        <Label>Assign Courses</Label>
        {courses.length > 0 ? (
          courses.map((course) => (
            <div key={course.id} className='flex items-center space-x-2'>
              <Checkbox
                id={`course-${course.id}`}
                checked={courseIds.includes(course.id.toString())}
                onCheckedChange={() => onToggleCourse(course.id.toString())}
              />
              <Label
                htmlFor={`course-${course.id}`}
                className='text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                <span className='font-medium text-slate-800 dark:text-slate-200'>{course.code}</span> -{' '}
                {course.name}
              </Label>
            </div>
          ))
        ) : (
          <p className='text-sm text-slate-500'>No courses available.</p>
        )}
      </div>
    </div>
  );
}
