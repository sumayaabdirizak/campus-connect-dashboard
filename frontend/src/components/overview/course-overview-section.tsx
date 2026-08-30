'use client';

import Link from 'next/link';
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card';
import { Input } from '@/features/ui/components/input';
import { Skeleton } from '@/features/ui/components/skeleton';
import { cn } from '@/lib/utils';
import { courseColor } from '@/lib/student-courses/services/course-color';
import { MoodleCourseCard } from './moodle-course-card';
import type { CourseFilter } from './use-student-dashboard-data';
import type { StudentCourse } from '@/lib/student-courses/types';

export function CourseOverviewSection({
  courses,
  coursesLoading,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  view,
  onViewChange,
}: {
  courses: StudentCourse[];
  coursesLoading: boolean;
  filter: CourseFilter;
  onFilterChange: (filter: CourseFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  view: 'card' | 'list';
  onViewChange: (view: 'card' | 'list') => void;
}) {
  const filteredCourses = courses.filter((c) => {
    const p = c.progress || 0;
    const matchFilter =
      filter === 'inprogress'
        ? p > 0 && p < 100
        : filter === 'completed'
          ? p >= 100 || c.status === 'completed'
          : true;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.courseName.toLowerCase().includes(q) ||
      (c.courseCode || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='gap-3 border-b py-3'>
        <div className='flex flex-row flex-wrap items-center justify-between gap-2'>
          <CardTitle className='text-base font-semibold'>Course overview</CardTitle>
          <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
            {(
              [
                ['all', 'All'],
                ['inprogress', 'In progress'],
                ['completed', 'Completed']
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type='button'
                onClick={() => onFilterChange(key)}
                className={cn(
                  'rounded px-2.5 py-1 font-medium transition-colors',
                  filter === key
                    ? 'bg-card text-foreground'
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
              <Skeleton key={i} className='h-44 w-full rounded-lg' />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <p className='py-10 text-center text-sm text-muted-foreground'>No courses to show.</p>
        ) : view === 'card' ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {filteredCourses.map((c) => (
              <MoodleCourseCard key={c.id} course={c} />
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
                        {c.courseCode} · {c.instructor || 'Unassigned'}
                      </p>
                    </div>
                    <div className='hidden w-28 items-center gap-2 sm:flex'>
                      <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-muted'>
                        <div
                          className='h-full rounded-full'
                          style={{ width: `${c.progress || 0}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className='w-8 text-right text-xs font-semibold tabular-nums text-muted-foreground'>
                        {c.progress || 0}%
                      </span>
                    </div>
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
