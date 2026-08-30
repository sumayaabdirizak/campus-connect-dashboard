'use client';

import { ClipboardCheck, FileText } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import type { CourseTabId } from '@/lib/course-details/queries/types';
import { formatDueLabel, type ToReviewItem } from './types';

export function OverviewActivity({
  items,
  isStudent,
  description,
  syllabusUrl,
  onOpenTab,
}: {
  items: ToReviewItem[];
  isStudent?: boolean;
  description?: string | null;
  syllabusUrl?: string | null;
  onOpenTab?: (tab: CourseTabId) => void;
}) {
  const pending = items.filter(
    (item) => item.status !== 'Draft' && item.pendingCount > 0
  );

  return (
    <div className='rounded-xl border border-border bg-card'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5'>
        <div className='min-w-0'>
          <h2 className='text-base font-semibold text-foreground'>
            {isStudent ? 'Upcoming work' : 'Review queue'}
          </h2>
          {description?.trim() ? (
            <p className='mt-0.5 line-clamp-1 text-xs text-muted-foreground'>
              {description}
            </p>
          ) : null}
        </div>
        <div className='flex items-center gap-2'>
          {syllabusUrl ? (
            <Button
              variant='outline'
              size='sm'
              className='h-8 rounded-lg border-border'
              onClick={() =>
                window.open(syllabusUrl, '_blank', 'noopener,noreferrer')
              }
            >
              Syllabus
            </Button>
          ) : null}
          {!isStudent ? (
            <Button
              variant='outline'
              size='sm'
              className='h-8 rounded-lg border-border'
              onClick={() => onOpenTab?.('assignments')}
            >
              View all
            </Button>
          ) : null}
        </div>
      </div>

      {pending.length === 0 ? (
        <p className='px-4 py-12 text-center text-sm text-muted-foreground sm:px-5'>
          {isStudent
            ? 'No assignments or quizzes waiting right now.'
            : 'No submissions waiting for grading.'}
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[520px] text-left text-sm'>
            <thead>
              <tr className='border-b border-border bg-muted text-xs font-medium text-muted-foreground'>
                <th className='px-4 py-2.5 font-medium sm:px-5'>Item</th>
                <th className='px-4 py-2.5 font-medium'>Type</th>
                <th className='px-4 py-2.5 font-medium'>Due</th>
                <th className='px-4 py-2.5 font-medium text-right sm:px-5'>
                  {isStudent ? 'Status' : 'Count'}
                </th>
              </tr>
            </thead>
            <tbody>
              {pending.slice(0, 8).map((item) => {
                const Icon =
                  item.type === 'quiz' ? ClipboardCheck : FileText;
                const tab: CourseTabId =
                  item.type === 'quiz' ? 'quizzes' : 'assignments';
                return (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className='cursor-pointer border-b border-border last:border-b-0 hover:bg-muted'
                    onClick={() => onOpenTab?.(tab)}
                  >
                    <td className='px-4 py-3 sm:px-5'>
                      <div className='flex items-center gap-2.5'>
                        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                          <Icon className='size-4' />
                        </span>
                        <span className='truncate font-medium text-foreground'>
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3 capitalize text-muted-foreground'>
                      {item.type}
                    </td>
                    <td className='px-4 py-3 text-muted-foreground'>
                      {formatDueLabel(item.dueAt)}
                    </td>
                    <td className='px-4 py-3 text-right sm:px-5'>
                      <span className='inline-flex rounded-md bg-[#FFF7ED] px-2 py-0.5 text-[11px] font-semibold text-[#C2410C]'>
                        {isStudent
                          ? 'Due'
                          : item.pendingCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
