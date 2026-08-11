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
    <div className='mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm'>
      <div className='flex items-center gap-2 border-b border-[#F2F4F7] px-4 py-3.5'>
        <span className='flex size-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3B82F6]'>
          <History className='size-3.5' />
        </span>
        <h2 className='text-sm font-bold text-[#101828]'>Semester History</h2>
      </div>
      <ul className='divide-y divide-[#F2F4F7]'>
        {semesters.map((s) => {
          const open = openId === s.semesterId;
          return (
            <li key={s.semesterId}>
              <button
                type='button'
                onClick={() => setOpenId(open ? null : s.semesterId)}
                className='flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#F8FAFC]'
              >
                <span>
                  <span className='text-sm font-medium text-[#101828]'>{s.semesterName}</span>
                  <span className='ml-2 text-xs text-[#98A2B3]'>{s.academicYearName}</span>
                </span>
                <span className='flex items-center gap-2 text-xs text-[#667085]'>
                  {s.courses.length} course{s.courses.length === 1 ? '' : 's'}
                  {open ? <ChevronDown className='size-3.5' /> : <ChevronRight className='size-3.5' />}
                </span>
              </button>
              {open ? (
                <div className='px-4 pb-3'>
                  <ul className='divide-y divide-[#F2F4F7] rounded-lg border border-[#F2F4F7]'>
                    {s.courses.map((c) => (
                      <li
                        key={c.code}
                        className='flex items-center justify-between gap-2 px-3 py-2 text-sm'
                      >
                        <span>
                          <span className='font-medium text-[#101828]'>{c.code}</span>{' '}
                          <span className='text-[#667085]'>{c.name}</span>
                        </span>
                        <span className='text-xs text-[#98A2B3]'>{c.credits} credits</span>
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
