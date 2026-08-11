'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { courseColor } from '@/lib/student-courses/services/course-color';
import type { DeadlineRow } from './types';

export function MonthCalendarDayList({
  selected,
  items,
  featured = false,
}: {
  selected: Date;
  items: DeadlineRow[];
  featured?: boolean;
}) {
  const router = useRouter();

  const openDeadline = (d: DeadlineRow) => {
    if (d.kind === 'announcement') router.push('/dashboard/calendar');
    else if (d.courseOfferingId)
      router.push(
        d.kind === 'quiz'
          ? `/dashboard/courses/${d.courseOfferingId}?tab=quizzes&quiz=${d.id}`
          : `/dashboard/courses/${d.courseOfferingId}?tab=assignments`
      );
  };

  return (
    <div
      className={
        featured
          ? 'mt-3 space-y-1 border-t pt-3 sm:mt-0 sm:min-h-0 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0'
          : 'mt-3 space-y-1 border-t pt-3'
      }
    >
      <p className='text-xs font-medium text-muted-foreground'>
        {format(selected, 'EEEE, d MMM')}
      </p>
      {items.length === 0 ? (
        <p className='py-2 text-xs text-muted-foreground'>No deadlines this day.</p>
      ) : (
        items.map((d) => (
          <button
            key={`${d.kind}-${d.id}`}
            type='button'
            onClick={() => openDeadline(d)}
            className='flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          >
            <span
              className='size-2 shrink-0 rounded-full'
              style={{ backgroundColor: courseColor(d.courseCode ?? d.title) }}
            />
            <span className='truncate text-xs text-foreground'>
              {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
