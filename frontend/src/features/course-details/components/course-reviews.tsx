'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, ChevronRight, FileText, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoursePageShell } from './_shared/course-page-shell';
import { EmptyState } from './_shared/empty-state';
import type { CourseTabId } from '../config/course-tabs';

export interface ReviewQueueItem {
  id: number;
  type: 'assignment' | 'quiz';
  title: string;
  pendingCount: number;
  status: string;
  dueAt?: string | null;
  openAt?: string | null;
}

interface CourseReviewsProps {
  items: ReviewQueueItem[];
  isStudent: boolean;
  onOpenTab: (tab: CourseTabId) => void;
}

function formatDue(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function CourseReviews({ items, isStudent, onOpenTab }: CourseReviewsProps) {
  const activeItems = useMemo(
    () => items.filter((t) => t.status !== 'Draft'),
    [items]
  );

  const pendingTotal = useMemo(
    () => activeItems.reduce((sum, i) => sum + i.pendingCount, 0),
    [activeItems]
  );

  const title = isStudent ? 'Your tasks' : 'Review queue';
  const description = isStudent
    ? 'Assignments and quizzes that need your attention, sorted by due date.'
    : 'Submissions and quiz attempts waiting for your review.';

  return (
    <CoursePageShell
      title={title}
      description={description}
      actions={
        pendingTotal > 0 ? (
          <Badge variant='secondary' className='font-normal tabular-nums'>
            {pendingTotal} pending
          </Badge>
        ) : undefined
      }
      flush
    >
      {activeItems.length === 0 ? (
        <div className='p-6'>
          <EmptyState
            icon={ClipboardList}
            title={isStudent ? 'All caught up' : 'Nothing to review'}
            description={
              isStudent
                ? 'You have no pending assignments or quizzes right now.'
                : 'When students submit work, it will appear here for grading.'
            }
          />
        </div>
      ) : (
        <ul className='divide-y divide-border/60' role='list'>
          {activeItems.map((item) => {
            const targetTab: CourseTabId = item.type === 'quiz' ? 'quizzes' : 'assignments';
            const TypeIcon = item.type === 'quiz' ? ClipboardCheck : FileText;
            const due = formatDue(item.dueAt);

            return (
              <li key={`${item.type}-${item.id}`}>
                <button
                  type='button'
                  onClick={() => onOpenTab(targetTab)}
                  className='flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40 sm:px-6'
                >
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg',
                      item.type === 'assignment'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                    )}
                  >
                    <TypeIcon className='size-5' aria-hidden />
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='truncate text-sm font-medium text-foreground'>{item.title}</p>
                      <Badge variant='outline' className='text-[10px] uppercase'>
                        {item.type}
                      </Badge>
                      {item.status !== 'Active' && (
                        <Badge variant='secondary' className='text-[10px]'>
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      {isStudent
                        ? item.pendingCount > 0
                          ? 'Not yet submitted'
                          : 'Submitted'
                        : `${item.pendingCount} submission${item.pendingCount !== 1 ? 's' : ''} to review`}
                      {due ? ` · Due ${due}` : ''}
                    </p>
                  </div>

                  <div className='flex shrink-0 items-center gap-2'>
                    {item.pendingCount > 0 && (
                      <span className='rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary'>
                        {item.pendingCount}
                      </span>
                    )}
                    <ChevronRight className='size-4 text-muted-foreground' aria-hidden />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!isStudent && activeItems.length > 0 && (
        <div className='border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6'>
          <p className='text-xs text-muted-foreground'>
            Select an item to open the full grading workspace in Assignments or Quizzes.
          </p>
          <div className='mt-2 flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' onClick={() => onOpenTab('assignments')}>
              Open assignments
            </Button>
            <Button variant='outline' size='sm' onClick={() => onOpenTab('quizzes')}>
              Open quizzes
            </Button>
          </div>
        </div>
      )}
    </CoursePageShell>
  );
}
