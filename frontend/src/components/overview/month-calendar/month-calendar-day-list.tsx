'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { courseColor } from '@/lib/student-courses/services/course-color';
import { cn } from '@/lib/utils';
import type { DeadlineKind, DeadlineRow } from './types';

function kindMeta(kind: DeadlineKind) {
  switch (kind) {
    case 'quiz':
      return {
        label: 'Quiz',
        chipClass:
          'border-primary/30 bg-primary/12 text-[#1D4ED8] dark:text-primary',
      };
    case 'assignment':
      return {
        label: 'Assignment',
        chipClass:
          'border-amber-500/35 bg-amber-500/12 text-amber-900 dark:text-amber-300',
      };
    default:
      return {
        label: 'Announcement',
        chipClass:
          'border-violet-500/35 bg-violet-500/12 text-violet-800 dark:text-violet-300',
      };
  }
}

function formatDueTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

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
          ? 'mt-3 space-y-2 border-t border-border pt-3 sm:mt-0 sm:min-h-0 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0'
          : 'mt-3 space-y-2 border-t border-border pt-3'
      }
    >
      <p className='text-xs font-semibold text-foreground'>
        {format(selected, 'EEEE, d MMM')}
      </p>
      {items.length === 0 ? (
        <p className='py-2 text-xs text-muted-foreground'>No deadlines this day.</p>
      ) : (
        <ul className='space-y-1.5'>
          {items.map((d) => {
            const meta = kindMeta(d.kind);
            const dotColor = courseColor(d.courseCode ?? d.title);
            const dueTime = formatDueTime(d.deadlineAt);

            return (
              <li key={`${d.kind}-${d.id}`}>
                <button
                  type='button'
                  onClick={() => openDeadline(d)}
                  className='flex w-full items-start gap-2 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                >
                  <span
                    className='mt-1.5 size-2.5 shrink-0 rounded-full ring-2 ring-background'
                    style={{ backgroundColor: dotColor }}
                    aria-hidden
                  />
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span
                        className={cn(
                          'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          meta.chipClass
                        )}
                      >
                        {meta.label}
                      </span>
                      {d.courseCode ? (
                        <span className='text-[11px] font-semibold text-foreground'>
                          {d.courseCode}
                        </span>
                      ) : null}
                    </div>
                    <p className='mt-0.5 line-clamp-2 text-sm font-medium text-foreground'>
                      {d.title}
                    </p>
                  </div>
                  {dueTime ? (
                    <span className='shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-muted-foreground'>
                      {dueTime}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
