'use client';

import { CalendarClock, ClipboardList, HelpCircle } from 'lucide-react';
import { useQuery } from '@/lib/async-query';
import { fetchUpcomingDeadlines } from '@/lib/reports/queries';
import type { OversightScope } from '@/lib/reports/types';

function formatDueIn(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now();
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

/** Course-level assignment/quiz due dates only — never a specific student's submission or grade. */
export function UpcomingDeadlinesPanel({
  scope,
  facultyId,
}: {
  scope: OversightScope;
  facultyId?: number | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', scope, 'upcoming-deadlines', facultyId ?? null],
    queryFn: () => fetchUpcomingDeadlines(scope, { days: 14, facultyId }),
  });

  const rows = data?.results ?? [];

  return (
    <div className='overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm'>
      <div className='flex items-center gap-2 border-b border-[#F2F4F7] px-4 py-3.5'>
        <CalendarClock className='size-4 text-[#667085]' />
        <h2 className='text-sm font-bold text-[#101828]'>Upcoming deadlines</h2>
        <span className='text-xs text-[#98A2B3]'>· next 14 days</span>
      </div>
      <div className='px-4 py-2'>
        {isLoading ? (
          <p className='py-4 text-center text-sm text-[#667085]'>Loading…</p>
        ) : rows.length > 0 ? (
          <ul className='divide-y divide-[#F2F4F7]'>
            {rows.slice(0, 6).map((r) => (
              <li key={`${r.kind}-${r.id}`} className='flex items-start gap-2.5 py-2.5'>
                <span className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#8B5CF6]'>
                  {r.kind === 'QUIZ' ? (
                    <HelpCircle className='size-3.5' aria-hidden />
                  ) : (
                    <ClipboardList className='size-3.5' aria-hidden />
                  )}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-[#101828]'>{r.title}</p>
                  <p className='truncate text-xs text-[#667085]'>
                    {r.courseCode ?? r.courseName ?? 'Course'} · {formatDueIn(r.dueAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className='py-4 text-center text-sm text-[#667085]'>No deadlines in the next 14 days.</p>
        )}
      </div>
    </div>
  );
}
