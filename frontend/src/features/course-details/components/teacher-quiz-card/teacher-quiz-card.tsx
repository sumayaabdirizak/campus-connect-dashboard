'use client';

import type { Quiz } from '../../api/quizzes-types';
import { TeacherQuizCardHeader } from './teacher-quiz-card-header';
import { TeacherQuizCardActions } from './teacher-quiz-card-actions';

export function TeacherQuizCard({
  quiz: q,
  onSettings,
  onEditQuestions,
  onViewAttempts,
  onDelete,
  onTogglePublish,
  onDuplicate,
  onPreview,
  selected,
  onToggleSelect,
  anySelected
}: {
  quiz: Quiz;
  onSettings: () => void;
  onEditQuestions: () => void;
  onViewAttempts: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  anySelected: boolean;
}) {
  const questionCount = q.questions?.length ?? 0;
  const isEmpty = questionCount === 0;

  return (
    <div
      className={`group border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-muted/30 focus-within:ring-2 focus-within:ring-primary/40 ${
        isEmpty && !q.is_draft ? 'border-warning' : ''
      } ${selected ? 'ring-2 ring-primary/50 bg-primary/[0.02]' : ''}`}
    >
      <TeacherQuizCardHeader
        quiz={q}
        selected={selected}
        anySelected={anySelected}
        onToggleSelect={onToggleSelect}
      />
      <TeacherQuizCardActions
        quiz={q}
        isEmpty={isEmpty}
        onSettings={onSettings}
        onEditQuestions={onEditQuestions}
        onViewAttempts={onViewAttempts}
        onDelete={onDelete}
        onTogglePublish={onTogglePublish}
        onDuplicate={onDuplicate}
        onPreview={onPreview}
      />
    </div>
  );
}
