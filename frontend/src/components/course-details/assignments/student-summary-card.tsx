'use client';

import { cn } from '@/lib/utils';

import { useMyAssignmentSummary } from '@/lib/course-details/queries/assignments-queries';


/// Course-wide rollup at the top of the student assignments view. Five
/// numbers that answer "where do I stand?" at a glance:
///   - average grade across all graded submissions
///   - submitted of total published
///   - graded count
///   - late count
///   - missing count (past due + never submitted)
/// Renders nothing when there are no assignments yet — saves an empty card
/// taking up space on an otherwise-empty tab.
export function StudentSummaryCard({ courseId }: { courseId: string }) {
  const { data } = useMyAssignmentSummary(courseId);
  if (!data || data.totalPublished === 0) return null;

  const avgText =
    data.avgGrade == null
      ? 'text-muted-foreground'
      : data.avgGrade >= 80
        ? 'text-emerald-600 dark:text-emerald-400'
        : data.avgGrade >= 60
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-rose-600 dark:text-rose-400';

  return (
    <div className='rounded-xl border bg-card p-4 shadow-sm'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <h3 className='text-sm font-medium'>Your progress</h3>
        {data.missingCount > 0 ? (
          <span className='text-xs text-muted-foreground'>{data.missingCount} overdue</span>
        ) : null}
      </div>

      <div className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-5'>
        <div>
          <p className='text-xs text-muted-foreground'>Avg grade</p>
          <p className={cn('font-semibold tabular-nums', avgText)}>
            {data.avgGrade != null ? `${data.avgGrade}%` : '—'}
          </p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Submitted</p>
          <p className='font-semibold tabular-nums'>
            {data.submittedCount}
            <span className='font-normal text-muted-foreground'> / {data.totalPublished}</span>
          </p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Graded</p>
          <p className='font-semibold tabular-nums'>{data.gradedCount}</p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Late</p>
          <p className='font-semibold tabular-nums'>{data.lateCount}</p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Missing</p>
          <p className='font-semibold tabular-nums'>{data.missingCount}</p>
        </div>
      </div>
    </div>
  );
}
