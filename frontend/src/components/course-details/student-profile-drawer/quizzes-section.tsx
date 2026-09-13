import { Skeleton } from '@/features/ui/components/skeleton';
import { BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import type { StudentWork } from '@/lib/course-details/services/student-profile-types';
import { EmptyState } from '../_shared/empty-state';
import { fmtPoints } from '../course-gradebook/gradebook-math';
import { WorkTable, WorkTableCell, WorkTableRow } from './work-table';

export function QuizzesSection({
  work,
  loading
}: {
  work: StudentWork | undefined;
  loading: boolean;
}) {
  return (
    <section className='space-y-3'>
      <h3 className='flex items-center gap-2 text-sm font-semibold text-foreground'>
        <BookOpen className='size-4 text-[#667085] dark:text-muted-foreground' />
        Quizzes
      </h3>
      {loading ? (
        <Skeleton className='h-24 w-full rounded-lg' />
      ) : !work || work.quizAttempts.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title='No quiz attempts yet'
          description='Quiz scores will show here after this student submits attempts.'
          className='p-6'
        />
      ) : (
        <>
          <p className='text-sm text-foreground'>
            <span className='font-medium tabular-nums'>{work.quizAttempts.length}</span>
            <span className='text-[#667085] dark:text-muted-foreground'>
              {work.quizAttempts.length === 1 ? ' attempt' : ' attempts'}
            </span>
          </p>

          <WorkTable headers={['Quiz', 'Submitted', 'Score']}>
            {work.quizAttempts.map((attempt) => {
              const pct = attempt.score ?? attempt.grade ?? null;
              const maxMarks = attempt.quiz.maxMarks ?? 0;
              const earned =
                pct != null && maxMarks > 0 ? (pct / 100) * maxMarks : null;

              return (
                <WorkTableRow key={attempt.id}>
                  <WorkTableCell className='max-w-[200px]'>
                    <p className='truncate font-medium text-foreground'>{attempt.quiz.title}</p>
                  </WorkTableCell>
                  <WorkTableCell>
                    {attempt.submitted_at ? (
                      <span className='text-foreground'>
                        {format(new Date(attempt.submitted_at), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className='text-[#667085] dark:text-muted-foreground'>—</span>
                    )}
                  </WorkTableCell>
                  <WorkTableCell align='right'>
                    <span className='font-medium tabular-nums text-foreground'>
                      {earned != null && maxMarks > 0
                        ? fmtPoints(earned, maxMarks)
                        : pct != null
                          ? `${Math.round(pct)}/100`
                          : '—'}
                    </span>
                  </WorkTableCell>
                </WorkTableRow>
              );
            })}
          </WorkTable>
        </>
      )}
    </section>
  );
}
