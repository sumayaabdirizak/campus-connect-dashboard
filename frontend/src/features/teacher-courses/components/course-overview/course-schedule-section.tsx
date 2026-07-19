'use client';

import { CoursePageShell } from '@/features/course-details/components/_shared/course-page-shell';
import { DAY_NAMES, formatScheduleTime, type ScheduleRow } from './types';

export function CourseScheduleSection({
  schedules,
  accentColor
}: {
  schedules: ScheduleRow[];
  accentColor: string;
}) {
  return (
    <CoursePageShell
      title='Weekly schedule'
      description='Class times and locations for this offering.'
      className='lg:col-span-1'
      flush
    >
      {schedules.length === 0 ? (
        <p className='px-4 py-8 text-center text-sm text-muted-foreground sm:px-6'>
          No classes scheduled yet.
        </p>
      ) : (
        <ul className='divide-y divide-border/60' role='list'>
          {schedules.map((s) => (
            <li key={s.id} className='flex items-center gap-3 px-4 py-3 sm:px-6'>
              <span
                className='flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold'
                style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
              >
                {DAY_NAMES[s.day_of_week]}
              </span>
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium'>
                  {formatScheduleTime(s.start_time)} – {formatScheduleTime(s.end_time)}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {s.location || 'Location TBD'}
                  {s.topic ? ` · ${s.topic}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CoursePageShell>
  );
}
