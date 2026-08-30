import { Badge } from '@/features/ui/components/badge';
import { Skeleton } from '@/features/ui/components/skeleton';
import { BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import type { StudentWork } from '@/lib/course-details/services/student-profile-types';

export function QuizzesSection({
  work,
  loading
}: {
  work: StudentWork | undefined;
  loading: boolean;
}) {
  return (
    <section className='space-y-3'>
      <h3 className='text-sm font-medium flex items-center gap-2'>
        <BookOpen className='w-4 h-4' /> Quizzes
      </h3>
      {loading ? (
        <Skeleton className='h-16 w-full' />
      ) : !work || work.quizAttempts.length === 0 ? (
        <p className='text-xs text-muted-foreground italic'>No attempts yet.</p>
      ) : (
        <ul className='space-y-1 max-h-40 overflow-y-auto'>
          {work.quizAttempts.map((a) => (
              <li
                key={a.id}
                className='flex items-center justify-between text-xs border rounded px-2 py-1'
              >
                <span className='truncate'>{a.quiz.title}</span>
                <span className='flex items-center gap-2 shrink-0'>
                  {a.submitted_at && (
                    <span className='text-muted-foreground'>
                      {format(new Date(a.submitted_at), 'MMM d')}
                    </span>
                  )}
                  <Badge variant={a.score == null ? 'secondary' : 'default'}>
                    {a.score != null ? `${Math.round(a.score)}%` : '—'}
                  </Badge>
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
