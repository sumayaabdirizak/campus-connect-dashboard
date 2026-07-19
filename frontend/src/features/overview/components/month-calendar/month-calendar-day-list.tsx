'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { deadlineRowToCalendarInput } from '@/features/calendar/deadline-calendar';
import type { DeadlineRow } from './types';

export function MonthCalendarDayList({
  selected,
  items
}: {
  selected: Date;
  items: DeadlineRow[];
}) {
  const router = useRouter();

  const openDeadline = (d: DeadlineRow) => {
    if (d.kind === 'announcement') router.push('/dashboard/calendar');
    else if (d.courseOfferingId)
      router.push(
        `/dashboard/courses/${d.courseOfferingId}?tab=${d.kind === 'quiz' ? 'quizzes' : 'assignments'}`
      );
  };

  return (
    <div className='mt-3 space-y-1 border-t pt-3'>
      <p className='text-xs font-medium text-muted-foreground'>{format(selected, 'EEEE, d MMM')}</p>
      {items.length === 0 ? (
        <p className='py-2 text-xs text-muted-foreground'>No deadlines this day.</p>
      ) : (
        items.map((d) => {
          const deadline = deadlineRowToCalendarInput(d);
          return (
            <div
              key={`${d.kind}-${d.id}`}
              className='flex items-start gap-1 rounded-md p-1 transition-colors hover:bg-muted'
            >
              <button
                type='button'
                onClick={() => openDeadline(d)}
                className='flex min-w-0 flex-1 items-center gap-2 p-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
              >
                <span
                  className='size-2 shrink-0 rounded-full'
                  style={{ backgroundColor: courseColor(d.courseCode ?? d.title) }}
                />
                <span className='truncate text-xs text-foreground'>
                  {d.courseCode ? `${d.courseCode} · ${d.title}` : d.title}
                </span>
              </button>
              {deadline ? (
                <AddToCalendarButton
                  deadline={deadline}
                  className='shrink-0 px-1 text-[10px] text-muted-foreground'
                  label='Add'
                />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
