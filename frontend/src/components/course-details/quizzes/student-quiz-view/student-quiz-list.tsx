'use client';

import { BookOpen } from 'lucide-react';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { StudentQuizCard } from './student-quiz-card';

type Group = { module: CourseModule | null; quizzes: Quiz[] };

export function StudentQuizList({
  quizzes,
  groups,
  showGrouped,
  reviewLoadingId,
  startPending,
  onOpenResults,
  onStart,
}: {
  quizzes: Quiz[];
  groups: Group[];
  showGrouped: boolean;
  reviewLoadingId: number | null;
  startPending: boolean;
  onOpenResults: (attemptId: number) => void;
  onStart: (quizId: number) => void;
}) {
  const card = (q: Quiz) => (
    <StudentQuizCard
      key={q.id}
      quiz={q}
      reviewLoadingId={reviewLoadingId}
      startPending={startPending}
      onOpenResults={onOpenResults}
      onStart={() => onStart(q.id)}
    />
  );

  if (!showGrouped) {
    return <div className='space-y-3'>{quizzes.map(card)}</div>;
  }

  return (
    <div className='space-y-5'>
      {groups.map(({ module: mod, quizzes: qs }) => (
        <section key={mod?.id ?? 'ungrouped'} className='space-y-2'>
          <header className='flex items-center gap-2 pl-1'>
            <BookOpen className='w-3.5 h-3.5 text-muted-foreground' />
            <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none'>
              {mod ? mod.title : 'Other'}
            </h4>
            <span className='text-[11px] text-muted-foreground tabular-nums ml-1'>
              {qs.length}
            </span>
          </header>
          <div className='space-y-2'>{qs.map(card)}</div>
        </section>
      ))}
    </div>
  );
}
