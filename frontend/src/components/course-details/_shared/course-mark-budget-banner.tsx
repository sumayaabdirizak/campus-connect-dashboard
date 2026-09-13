'use client';

import { AlertTriangle } from 'lucide-react';
import type { CourseMarkBudget } from '@/lib/course-details/services/mark-budget-service';

export function CourseMarkBudgetBanner({
  budget,
  className
}: {
  budget: CourseMarkBudget | undefined;
  className?: string;
}) {
  if (!budget) return null;

  const overAllocated = budget.allocated > budget.courseMax;
  const exhausted = budget.remaining <= 0 && !overAllocated;
  const lowRemaining = !overAllocated && !exhausted && budget.remaining < 10;

  if (!overAllocated && !lowRemaining && !exhausted) return null;

  return (
    <div
      className={
        overAllocated || exhausted
          ? `rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-foreground ${className ?? ''}`
          : `rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-foreground dark:border-amber-800 dark:bg-amber-950/30 ${className ?? ''}`
      }
    >
      <div className='flex gap-2'>
        <AlertTriangle
          className={
            overAllocated || exhausted
              ? 'mt-0.5 size-4 shrink-0 text-destructive'
              : 'mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400'
          }
        />
        <div>
          <p className='font-medium'>
            {overAllocated
              ? `Mark budget exceeded (${budget.allocated}/${budget.courseMax})`
              : exhausted
                ? `All ${budget.courseMax} course marks are allocated`
                : `Only ${budget.remaining} marks left of ${budget.courseMax}`}
          </p>
          <p className='mt-1 text-[#667085] dark:text-muted-foreground'>
            {overAllocated
              ? 'Published assignments and quizzes share 100 course marks. Lower weights on the Assignments tab, or unpublish items, before publishing more quizzes.'
              : exhausted
                ? 'Unpublish or reduce marks on existing assignments and quizzes before creating new ones.'
                : 'Check assignment and quiz weights before publishing so the course total stays within 100 marks.'}
          </p>
        </div>
      </div>
    </div>
  );
}
