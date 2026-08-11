'use client';

import { cn } from '@/lib/utils';
import { OverviewMetaRow } from './overview-meta-row';

export function OverviewSummary({
  pending,
  assignments,
  quizzes,
  resources,
  credits,
  sectionName,
  batchName,
  studentCount,
  isStudent,
}: {
  pending: number;
  assignments: number;
  quizzes: number;
  resources: number;
  credits?: number;
  sectionName?: string;
  batchName?: string;
  studentCount?: number;
  isStudent?: boolean;
}) {
  const workload = assignments + quizzes;
  const doneHint =
    workload === 0
      ? 'No work posted yet'
      : pending === 0
        ? 'All clear'
        : `${pending} need attention`;

  return (
    <div className='rounded-xl border border-[#E5E7EB] bg-white'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3 sm:px-5'>
        <div className='flex min-w-0 items-center gap-2'>
          <h2 className='text-base font-semibold text-[#101828]'>
            Course summary
          </h2>
          <span className='rounded-md bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#3B82F6]'>
            {isStudent ? 'Student' : 'Instructor'}
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-4 text-sm'>
          <p className='text-[#667085]'>
            Work items{' '}
            <span className='ml-1 text-lg font-bold tabular-nums text-[#101828]'>
              {workload}
            </span>
          </p>
          <p className='text-[#667085]'>
            Resources{' '}
            <span className='ml-1 text-lg font-bold tabular-nums text-[#101828]'>
              {resources}
            </span>
          </p>
          {!isStudent ? (
            <p className='text-[#667085]'>
              Students{' '}
              <span className='ml-1 text-lg font-bold tabular-nums text-[#101828]'>
                {studentCount ?? 0}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className='grid gap-3 p-4 sm:grid-cols-3 sm:p-5'>
        <div className='rounded-xl border border-[#E5E7EB] p-4'>
          <div className='mb-3 flex items-center justify-between gap-2'>
            <p className='text-sm font-medium text-[#101828]'>Status</p>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                pending > 0
                  ? 'bg-[#FFF7ED] text-[#C2410C]'
                  : 'bg-[#ECFDF3] text-[#027A48]'
              )}
            >
              {pending > 0 ? 'Action needed' : 'Up to date'}
            </span>
          </div>
          <p className='text-sm text-[#667085]'>{doneHint}</p>
          {workload > 0 ? (
            <div className='mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEF2F6]'>
              <div
                className='h-full rounded-full bg-[#3B82F6]'
                style={{
                  width: `${Math.round(((workload - Math.min(pending, workload)) / workload) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>

        <div className='rounded-xl border border-[#E5E7EB] p-4'>
          <div className='flex flex-col gap-2.5'>
            <OverviewMetaRow label='Assignments' value={assignments} />
            <OverviewMetaRow label='Quizzes' value={quizzes} />
            <OverviewMetaRow label='Pending' value={pending} />
          </div>
        </div>

        <div className='rounded-xl border border-[#E5E7EB] p-4'>
          <div className='flex flex-col gap-2.5'>
            <OverviewMetaRow
              label='Credits'
              value={credits != null ? credits : '—'}
            />
            <OverviewMetaRow
              label='Section'
              value={
                [batchName, sectionName].filter(Boolean).join(' · ') || '—'
              }
            />
            <OverviewMetaRow label='Resources' value={resources} />
          </div>
        </div>
      </div>
    </div>
  );
}
