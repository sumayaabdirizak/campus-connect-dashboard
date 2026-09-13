'use client';

import { BookOpen, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '../../_shared/empty-state';
import { ListSkeleton } from '../../_shared/list-skeleton';
import { TeacherQuizCard } from '../teacher-quiz-card';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';

type QuizGroup = { module: CourseModule | null; quizzes: Quiz[] };

export type QuizCardHandlers = {
  onSettings: (q: Quiz) => void;
  onEditQuestions: (q: Quiz) => void;
  onViewAttempts: (q: Quiz) => void;
  onDelete: (q: Quiz) => void;
  onTogglePublish: (q: Quiz) => void;
  onDuplicate: (q: Quiz) => void;
  onPreview: (q: Quiz) => void;
  onToggleSelect: (id: number) => void;
};

export function TeacherQuizList({
  isLoading,
  sorted,
  groups,
  showGrouped,
  selectedIds,
  handlers,
  onCreate,
}: {
  isLoading: boolean;
  sorted: Quiz[];
  groups: QuizGroup[];
  showGrouped: boolean;
  selectedIds: Set<number>;
  handlers: QuizCardHandlers;
  onCreate: () => void;
}) {
  if (isLoading) return <ListSkeleton variant='row' count={2} />;
  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title='No quizzes yet'
        description='Create a quiz, add MCQ / True-False / Short-answer questions, then publish it.'
        actionLabel='New quiz'
        onAction={onCreate}
      />
    );
  }

  const anySelected = selectedIds.size > 0;
  const card = (q: Quiz) => (
    <TeacherQuizCard
      key={q.id}
      quiz={q}
      onSettings={() => handlers.onSettings(q)}
      onEditQuestions={() => handlers.onEditQuestions(q)}
      onViewAttempts={() => handlers.onViewAttempts(q)}
      onDelete={() => handlers.onDelete(q)}
      onTogglePublish={() => handlers.onTogglePublish(q)}
      onDuplicate={() => handlers.onDuplicate(q)}
      onPreview={() => handlers.onPreview(q)}
      selected={selectedIds.has(q.id)}
      onToggleSelect={() => handlers.onToggleSelect(q.id)}
      anySelected={anySelected}
    />
  );

  if (!showGrouped) {
    return <div className='space-y-2'>{sorted.map(card)}</div>;
  }

  return (
    <div className='space-y-5'>
      {groups.map(({ module: mod, quizzes: qs }) => (
        <section key={mod?.id ?? 'ungrouped'} className='space-y-2'>
          <header className='flex items-center gap-2 pl-1'>
            <BookOpen className='w-3.5 h-3.5 text-muted-foreground' />
            <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none'>
              {mod ? mod.title : 'Ungrouped'}
            </h4>
            {mod && !mod.publishedAt && (
              <Badge variant='outline' className='text-[10px]'>
                Draft chapter
              </Badge>
            )}
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
