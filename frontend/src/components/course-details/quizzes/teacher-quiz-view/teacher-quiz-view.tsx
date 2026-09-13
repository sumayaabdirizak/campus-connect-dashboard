'use client';

import { useMemo, useState } from 'react';
import { EditQuizPage } from '../new-quiz-page/edit-quiz-page';
import { NewQuizPage } from '../new-quiz-page/new-quiz-page';
import { TeacherAttemptsPanel } from '../teacher-attempts-panel';
import { useQuizzes } from '@/lib/course-details/queries/quizzes-queries';
import { useCourseMarkBudget } from '@/lib/course-details/queries/mark-budget-queries';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { TeacherQuizBulkBar } from './teacher-quiz-bulk-bar';
import { QuizListTable } from './quiz-list-table';
import { TeacherQuizPreview } from './teacher-quiz-preview';
import { TeacherQuizToolbar } from './teacher-quiz-toolbar';
import { useTeacherQuizActions } from './use-teacher-quiz-actions';
import { CourseTabPage } from '../../_shared/course-tab-page';
import { CourseMarkBudgetBanner } from '../../_shared/course-mark-budget-banner';
import { isMarkBudgetExhausted } from '@/lib/course-details/services/mark-budget-utils';

export function TeacherView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useQuizzes(courseId, { live: true });
  const { data: markBudget } = useCourseMarkBudget(courseId);
  const actions = useTeacherQuizActions(courseId);

  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Quiz | null>(null);
  const [previewing, setPreviewing] = useState<Quiz | null>(null);

  // The table sorts and paginates internally; this is just a stable base
  // order for the bulk bar's select-all and the header count.
  const sorted = useMemo(
    () => [...quizzes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [quizzes]
  );

  const liveEditingQuiz = editingQuiz
    ? quizzes.find((q) => q.id === editingQuiz.id) ?? editingQuiz
    : null;

  if (creatingQuiz) {
    return (
      <NewQuizPage
        courseId={courseId}
        onBack={() => setCreatingQuiz(false)}
        onCreated={() => {
          setCreatingQuiz(false);
        }}
      />
    );
  }

  if (liveEditingQuiz) {
    return (
      <EditQuizPage
        courseId={courseId}
        quiz={liveEditingQuiz}
        onBack={() => setEditingQuiz(null)}
        onSaved={() => setEditingQuiz(null)}
      />
    );
  }

  if (viewingAttempts) {
    return (
      <TeacherAttemptsPanel
        quiz={viewingAttempts}
        courseId={courseId}
        onBack={() => setViewingAttempts(null)}
      />
    );
  }

  if (previewing) {
    return (
      <TeacherQuizPreview quiz={previewing} onClose={() => setPreviewing(null)} />
    );
  }

  const budgetExhausted = markBudget != null && isMarkBudgetExhausted(markBudget);

  return (
    <CourseTabPage>
      <TeacherQuizToolbar
        quizCount={sorted.length}
        onCreate={() => setCreatingQuiz(true)}
        createDisabled={budgetExhausted}
        createDisabledReason='All course marks are allocated'
      />

      <CourseMarkBudgetBanner budget={markBudget} />

      <TeacherQuizBulkBar
        selectedCount={actions.selectedIds.size}
        totalCount={sorted.length}
        onToggleSelectAll={() => actions.toggleSelectAll(sorted)}
        onPublish={() => actions.handleBulkPublish(false)}
        onUnpublish={() => actions.handleBulkPublish(true)}
        onDelete={actions.handleBulkDelete}
        onCancel={actions.clearSelection}
      />

      <QuizListTable
        isLoading={isLoading}
        quizzes={sorted}
        selectedIds={actions.selectedIds}
        courseMaxMarks={markBudget?.courseMax}
        handlers={{
          onEditQuiz: setEditingQuiz,
          onViewAttempts: setViewingAttempts,
          onDelete: actions.undoDeleteQuiz,
          onTogglePublish: actions.togglePublish,
          onDuplicate: actions.handleDuplicate,
          onPreview: setPreviewing,
          onToggleSelect: actions.toggleSelect,
        }}
      />
    </CourseTabPage>
  );
}
