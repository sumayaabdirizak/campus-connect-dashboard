'use client';

import Link from 'next/link';
import { Search, LayoutGrid, List as ListIcon, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Course } from '@/features/teacher-courses/api/types';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { TeacherCourseTile } from './teacher-course-tile';

type CourseFilter = 'all' | 'active' | 'completed';

export function TeacherCoursesPanel({
  coursesLoading,
  filteredCourses,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  view,
  onViewChange,
}: {
  coursesLoading: boolean;
  filteredCourses: Course[];
  filter: CourseFilter;
  onFilterChange: (filter: CourseFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  view: 'card' | 'list';
  onViewChange: (view: 'card' | 'list') => void;
}) {
  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='gap-3 border-b py-3'>
        <div className='flex flex-row flex-wrap items-center justify-between gap-2'>
          <CardTitle className='text-base font-semibold'>My courses</CardTitle>
          <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
            {(
              [
                ['all', 'All'],
                ['active', 'Active'],
                ['completed', 'Completed'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type='button'
                onClick={() => onFilterChange(key)}
                className={cn(
                  'rounded px-2.5 py-1 font-medium transition-colors',
                  filter === key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='relative flex-1'>
            <Search className='absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Search courses...'
              className='h-8 pl-8 text-sm'
            />
          </div>
          <div className='flex rounded-md border p-0.5'>
            <button
              type='button'
              onClick={() => onViewChange('card')}
              aria-label='Card view'
              aria-pressed={view === 'card'}
              className={cn(
                'rounded p-1.5 transition-colors',
                view === 'card' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className='size-4' />
            </button>
            <button
              type='button'
              onClick={() => onViewChange('list')}
              aria-label='List view'
              aria-pressed={view === 'list'}
              className={cn(
                'rounded p-1.5 transition-colors',
                view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ListIcon className='size-4' />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-4'>
        {coursesLoading ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-40 w-full rounded-lg' />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <p className='py-10 text-center text-sm text-muted-foreground'>No courses to show.</p>
        ) : view === 'card' ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {filteredCourses.map((c) => (
              <TeacherCourseTile key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <ul className='divide-y divide-border'>
            {filteredCourses.map((c) => {
              const color = courseColor(c.courseCode);
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/courses/${c.id}`}
                    className='group flex items-center gap-3 py-3 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                  >
                    <span
                      className='flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white'
                      style={{ backgroundColor: color }}
                    >
                      {c.courseCode?.slice(0, 2).toUpperCase() || '··'}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium text-primary group-hover:underline'>
                        {c.courseName}
                      </p>
                      <p className='truncate text-xs text-muted-foreground'>
                        {c.courseCode}
                        {c.section ? ` · ${c.section}` : ''}
                      </p>
                    </div>
                    <span className='hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex'>
                      <Users className='size-3.5' />
                      {c.totalStudents}
                    </span>
                    <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
