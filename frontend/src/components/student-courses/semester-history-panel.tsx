'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { useSemesterHistory } from '@/lib/student-courses/queries';

export function SemesterHistoryPanel() {
  const { data, isLoading } = useSemesterHistory();
  const semesters = data?.semesters ?? [];
  const [openId, setOpenId] = useState<number | null>(null);

  if (isLoading || semesters.length === 0) return null;

  return (
    <div className='mt-6 overflow-hidden rounded-xl border border-border bg-card'>
      <div className='flex items-center gap-2 border-b border-border px-4 py-3.5'>
        <span className='flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
          <History className='size-3.5' />
        </span>
        <h2 className='text-sm font-bold text-foreground'>Semester History</h2>
      </div>
      <ul className='divide-y divide-[#F2F4F7]'>
        {semesters.map((s) => {
          const open = openId === s.semesterId;
          return (
            <li key={s.semesterId}>
              <button
                type='button'
                onClick={() => setOpenId(open ? null : s.semesterId)}
                className='flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted'
              >
                <span>
                  <span className='text-sm font-medium text-foreground'>{s.semesterName}</span>
                  <span className='ml-2 text-xs text-muted-foreground'>{s.academicYearName}</span>
                </span>
                <span className='flex items-center gap-2 text-xs text-muted-foreground'>
                  {s.courses.length} course{s.courses.length === 1 ? '' : 's'}
                  {open ? <ChevronDown className='size-3.5' /> : <ChevronRight className='size-3.5' />}
                </span>
              </button>
              {open ? (
                <div className='px-4 pb-3'>
                  <ul className='divide-y divide-[#F2F4F7] rounded-lg border border-border'>
                    {s.courses.map((c) => (
                      <li
                        key={c.code}
                        className='flex items-center justify-between gap-2 px-3 py-2 text-sm'
                      >
                        <span>
                          <span className='font-medium text-foreground'>{c.code}</span>{' '}
                          <span className='text-muted-foreground'>{c.name}</span>
                        </span>
                        <span className='text-xs text-muted-foreground'>{c.credits} credits</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
