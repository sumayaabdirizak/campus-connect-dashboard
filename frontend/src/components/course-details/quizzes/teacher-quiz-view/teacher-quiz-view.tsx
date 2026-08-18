'use client';

import { useMemo, useState } from 'react';
import { QuizBuilder } from '../quiz-builder';
import { groupQuizzesByModule } from '../course-quizzes-utils';
import { NewQuizPage } from '../new-quiz-page/new-quiz-page';
import { TeacherAttemptsPanel } from '../teacher-attempts-panel';
import { useQuizzes } from '@/lib/course-details/queries/quizzes-queries';
import { useModules } from '@/lib/course-details/queries/resources-queries';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { TeacherQuizBulkBar } from './teacher-quiz-bulk-bar';
import { TeacherQuizDialogs } from './teacher-quiz-dialogs';
import { TeacherQuizList } from './teacher-quiz-list';
import { TeacherQuizPreview } from './teacher-quiz-preview';
import { TeacherQuizToolbar } from './teacher-quiz-toolbar';
import { useTeacherQuizActions } from './use-teacher-quiz-actions';

export function TeacherView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useQuizzes(courseId);
  const { data: modules = [] } = useModules(courseId);
  const actions = useTeacherQuizActions(courseId);

  const [settingsTarget, setSettingsTarget] = useState<Quiz | null>(null);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState<Quiz | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Quiz | null>(null);
  const [previewing, setPreviewing] = useState<Quiz | null>(null);
  const [aiQuizOpen, setAiQuizOpen] = useState(false);

  const sorted = useMemo(
    () => [...quizzes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [quizzes]
  );
  const groups = useMemo(
    () => groupQuizzesByModule(sorted, modules),
    [sorted, modules]
  );
  const showGrouped =
    groups.length > 1 || (groups[0]?.module ?? null) !== null;

  const liveEditingQuestions = editingQuestions
    ? quizzes.find((q) => q.id === editingQuestions.id) ?? editingQuestions
    : null;
  const liveSettingsTarget = settingsTarget
    ? quizzes.find((q) => q.id === settingsTarget.id) ?? settingsTarget
    : settingsTarget;

  if (creatingQuiz) {
    return (
      <NewQuizPage
        courseId={courseId}
        modules={modules}
        onBack={() => setCreatingQuiz(false)}
        onCreated={(quiz) => {
          setCreatingQuiz(false);
          setEditingQuestions(quiz);
        }}
      />
    );
  }

  if (liveEditingQuestions) {
    return (
      <QuizBuilder
        courseId={courseId}
        quiz={liveEditingQuestions}
        onBack={() => setEditingQuestions(null)}
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

  return (
    <div className='space-y-4'>
      <TeacherQuizToolbar
        quizCount={sorted.length}
        onOpenAi={() => setAiQuizOpen(true)}
        onCreate={() => setCreatingQuiz(true)}
      />

      <TeacherQuizBulkBar
        selectedCount={actions.selectedIds.size}
        totalCount={sorted.length}
        onToggleSelectAll={() => actions.toggleSelectAll(sorted)}
        onPublish={() => actions.handleBulkPublish(false)}
        onUnpublish={() => actions.handleBulkPublish(true)}
        onDelete={actions.handleBulkDelete}
        onCancel={actions.clearSelection}
      />

      <TeacherQuizList
        isLoading={isLoading}
        sorted={sorted}
        groups={groups}
        showGrouped={showGrouped}
        selectedIds={actions.selectedIds}
        onCreate={() => setCreatingQuiz(true)}
        handlers={{
          onSettings: setSettingsTarget,
          onEditQuestions: setEditingQuestions,
          onViewAttempts: setViewingAttempts,
          onDelete: actions.undoDeleteQuiz,
          onTogglePublish: actions.togglePublish,
          onDuplicate: actions.handleDuplicate,
          onPreview: setPreviewing,
          onToggleSelect: actions.toggleSelect,
        }}
      />

      <TeacherQuizDialogs
        courseId={courseId}
        settingsTarget={settingsTarget}
        liveEditing={liveSettingsTarget}
        modules={modules}
        pending={
          actions.createMutation.isPending || actions.updateMutation.isPending
        }
        mutateCreate={actions.createMutation.mutate}
        mutateUpdate={actions.updateMutation.mutate}
        aiQuizOpen={aiQuizOpen}
        onCloseSettings={() => setSettingsTarget(null)}
        onAiOpenChange={setAiQuizOpen}
        onQuizCreated={setEditingQuestions}
      />
    </div>
  );
}
