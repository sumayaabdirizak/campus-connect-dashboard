'use client';

import { cn } from '@/lib/utils';
import type { Gradebook } from '@/lib/course-details/services/gradebook-types';
import { fmtPoints, fmtScoreFromPct } from './gradebook-math';

export function GradebookFooter({
  data,
  stickyCell
}: {
  data: Gradebook;
  stickyCell: string;
}) {
  const { columns, classAverages, courseMaxMarks } = data;
  const overallMax = courseMaxMarks > 0 ? courseMaxMarks : 100;
  const classEarned = classAverages.overallEarned;

  return (
    <tfoot>
      <tr className='border-t border-border/60 text-xs text-muted-foreground'>
        <td className={cn(stickyCell, 'px-3 py-2.5 font-medium')}>Class average</td>
        {columns.assignments.map((a) => {
          const avg =
            classAverages.assignments[a.id] ??
            classAverages.assignments[String(a.id)] ??
            null;
          return (
            <td
              key={`af-${a.id}`}
              className='border-l border-border/40 px-2 py-2.5 text-center tabular-nums'
            >
              {fmtScoreFromPct(avg, a.maxMarks)}
            </td>
          );
        })}
        {columns.quizzes.map((q) => {
          const avg =
            classAverages.quizzes[q.id] ??
            classAverages.quizzes[String(q.id)] ??
            null;
          return (
            <td
              key={`qf-${q.id}`}
              className='border-l border-border/40 px-2 py-2.5 text-center tabular-nums'
            >
              {q.maxMarks > 0 ? fmtScoreFromPct(avg, q.maxMarks) : '—'}
            </td>
          );
        })}
        <td className='border-l border-border/40 px-2 py-2.5 text-center font-medium tabular-nums text-foreground'>
          {classEarned != null ? fmtPoints(classEarned, overallMax) : '—'}
        </td>
      </tr>
    </tfoot>
  );
}
