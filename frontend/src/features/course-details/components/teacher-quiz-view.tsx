'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  ClipboardList,
  Library,
  Plus,
  Sparkles,
  Square,
  Trash2
} from 'lucide-react';
import { QuizBuilder } from './quiz-builder';
import { QuizSettingsDialog } from './quiz-settings-form';
import { QuestionBankManager } from './question-bank-manager';
import { AiGenerateDialog } from './ai-generate-dialog';
import { StudentAttempt } from './student-quiz-attempt';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { groupQuizzesByModule } from './course-quizzes-utils';
import { TeacherAttemptsPanel } from './teacher-attempts-panel';
import { TeacherQuizCard } from './teacher-quiz-card';
import { useQueryClient } from '@/lib/async-query';
import {
  deleteQuiz as deleteQuizCall,
  updateQuiz
} from '../api/quizzes-service';
import { quizKeys, useCreateQuiz, useDuplicateQuiz, useQuizzes, useUpdateQuiz } from '../api/quizzes-queries';
import { useModules } from '../api/resources-queries';
import { toast } from 'sonner';
import type { CreateQuizInput, Quiz, QuizStartResponse, UpdateQuizInput } from '../api/quizzes-types';

export function TeacherView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useQuizzes(courseId);
  // Pulled separately so the Settings dialog can offer the chapter picker
  // and the list view can group by chapter. Cheap query — same one Resources
  // already runs, so React Query will dedupe.
  const { data: modules = [] } = useModules(courseId);
  const createMutation = useCreateQuiz(courseId);
  const updateMutation = useUpdateQuiz(courseId);
  const duplicateMutation = useDuplicateQuiz(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  // Optimistic publish-toggle. Flips `is_draft` on the cached list right away
  // (so the badge updates without a network flash) and rolls back if the
  // PATCH fails. We can't reuse updateMutation's onSuccess invalidate here
  // because that would refetch and visually "blink" the row — the optimistic
  // patch is cleaner for a simple boolean toggle.
  const togglePublish = (quiz: Quiz) => {
    const key = quizKeys.list(courseId);
    const nextDraft = !quiz.is_draft;
    if (!nextDraft && (quiz.questions?.length ?? 0) === 0) {
      toast.error('Add at least one question before publishing');
      return;
    }
    const snapshot = queryClient.getQueryData<Quiz[]>(key);
    queryClient.setQueryData<Quiz[]>(key, (prev) =>
      (prev ?? []).map((q) => (q.id === quiz.id ? { ...q, is_draft: nextDraft } : q))
    );
    updateMutation.mutate(
      { quizId: quiz.id, input: { is_draft: nextDraft } },
      {
        onSuccess: () => {
          toast.success(nextDraft ? 'Quiz unpublished' : 'Quiz published');
        },
        onError: (e: Error) => {
          // Roll back the optimistic patch.
          if (snapshot) queryClient.setQueryData<Quiz[]>(key, snapshot);
          toast.error(e.message);
        },
      }
    );
  };

  const handleDuplicate = (quiz: Quiz) => {
    duplicateMutation.mutate(quiz.id, {
      onSuccess: () => toast.success(`Duplicated "${quiz.title}" as a draft`),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  // Each runs N requests in parallel via Promise.allSettled — partial
  // failures still report what worked. We let React Query refetch the list
  // once, after the whole batch settles, instead of invalidating per call.
  const runBulk = async (
    label: string,
    op: (id: number) => Promise<unknown>
  ) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(ids.map(op));
    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;
    queryClient.invalidateQueries({ queryKey: quizKeys.list(courseId) });
    queryClient.invalidateQueries({ queryKey: quizKeys.available(courseId) });
    if (failCount === 0) {
      toast.success(`${label} ${okCount} quiz${okCount === 1 ? '' : 'zes'}`);
    } else if (okCount === 0) {
      toast.error(`Failed to ${label.toLowerCase()} ${failCount} quiz${failCount === 1 ? '' : 'zes'}`);
    } else {
      toast.warning(`${label} ${okCount}, failed ${failCount}`);
    }
    clearSelection();
  };

  const handleBulkPublish = (draft: boolean) =>
    runBulk(draft ? 'Unpublished' : 'Published', (id) =>
      updateQuiz(id, { is_draft: draft })
    );
  const handleBulkDelete = () =>
    runBulk('Deleted', (id) => deleteQuizCall(id));

  const undoDeleteQuiz = (quiz: Quiz) => {
    const key = quizKeys.list(courseId);
    const snapshot = queryClient.getQueryData<Quiz[]>(key);
    if (!snapshot) return;
    runDelete({
      label: `Quiz deleted · "${quiz.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<Quiz[]>(key, (prev) =>
          (prev ?? []).filter((q) => q.id !== quiz.id)
        );
      },
      restore: () => queryClient.setQueryData<Quiz[]>(key, () => snapshot),
      commit: () => deleteQuizCall(quiz.id)
    });
  };

  // Three modal/page states are mutually exclusive:
  //   - settingsTarget: settings dialog (null=closed, "create" sentinel for
  //     new quiz, or an existing Quiz row for edit)
  //   - editingQuestions: switches the screen to the QuizBuilder
  //   - viewingAttempts:  switches the screen to TeacherAttemptsPanel
  //   - previewing:       switches to the student attempt UI in preview mode
  const [settingsTarget, setSettingsTarget] = useState<Quiz | 'create' | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<Quiz | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Quiz | null>(null);
  const [previewing, setPreviewing] = useState<Quiz | null>(null);
  // Reusable question bank manager — opens from a header button.
  const [bankOpen, setBankOpen] = useState(false);
  // AI "generate a whole quiz" dialog — opens from a header button. On
  // success it creates a draft quiz and we drop straight into the builder.
  const [aiQuizOpen, setAiQuizOpen] = useState(false);
  // Bulk-selection state. A Set<number> of selected quiz ids; an empty set
  // means "no selection mode active" and the action bar is hidden.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const sorted = useMemo(
    () => [...quizzes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [quizzes]
  );

  // Quizzes grouped by chapter. Within each chapter we keep the
  // created_at-desc order from `sorted`; chapter order follows module.position
  // so it matches what the teacher sees on the Resources tab.
  const groups = useMemo(
    () => groupQuizzesByModule(sorted, modules),
    [sorted, modules]
  );
  const showGrouped = groups.length > 1 || (groups[0]?.module ?? null) !== null;

  // Keep the QuizBuilder's prop in sync with the cached list — after adding
  // a question, the list refetches and we want the builder to see the new
  // question without losing its `editingQuestions` state.
  const liveEditingQuestions = editingQuestions
    ? quizzes.find((q) => q.id === editingQuestions.id) ?? editingQuestions
    : null;
  // Same idea for the settings dialog — if `_count.attempts` changes between
  // opens, we want the latest value in the warning banner.
  const liveSettingsTarget =
    settingsTarget && settingsTarget !== 'create'
      ? quizzes.find((q) => q.id === settingsTarget.id) ?? settingsTarget
      : settingsTarget;

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
    // Synthesize a QuizStartResponse from the teacher's quiz payload — no
    // backend round-trip, no DB rows. Attempt id of -1 is a sentinel; the
    // StudentAttempt component never sends it anywhere because previewMode
    // gates all network calls.
    const previewData: QuizStartResponse = {
      attempt: {
        id: -1,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + previewing.duration_minutes * 60_000).toISOString(),
        violations_count: 0,
        warnings_shown: 0,
      },
      serverTime: new Date().toISOString(),
      quiz: {
        id: previewing.id,
        title: previewing.title,
        duration_minutes: previewing.duration_minutes,
        passing_score: previewing.passing_score,
        timing_mode: previewing.timing_mode,
        open_at: previewing.open_at,
        close_at: previewing.close_at,
      },
      questions: (previewing.questions ?? []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
        options: q.options.map((o) => ({ id: o.id, option_text: o.option_text })),
      })),
      savedAnswers: [],
      totalQuestions: previewing.questions?.length ?? 0,
      totalPoints: (previewing.questions ?? []).reduce((s, q) => s + q.points, 0),
    };
    return (
      <div className='space-y-3'>
        <Button variant='ghost' onClick={() => setPreviewing(null)} className='gap-1'>
          <ArrowLeft className='w-4 h-4' /> Back
        </Button>
        <StudentAttempt
          data={previewData}
          previewMode
          onClosePreview={() => setPreviewing(null)}
          onSubmitted={() => setPreviewing(null)}
        />
      </div>
    );
  }

  const handleSettingsSubmit = (
    payload:
      | { mode: 'create'; data: CreateQuizInput }
      | { mode: 'edit'; quizId: number; data: UpdateQuizInput }
  ) => {
    if (payload.mode === 'create') {
      createMutation.mutate(payload.data, {
        onSuccess: () => {
          toast.success('Quiz created');
          setSettingsTarget(null);
        },
        onError: (e: Error) => toast.error(e.message),
      });
    } else {
      updateMutation.mutate(
        { quizId: payload.quizId, input: payload.data },
        {
          onSuccess: () => {
            toast.success('Quiz updated');
            setSettingsTarget(null);
          },
          onError: (e: Error) => toast.error(e.message),
        }
      );
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center gap-2 flex-wrap'>
        <p className='text-sm text-muted-foreground tabular-nums'>
          {sorted.length} {sorted.length === 1 ? 'quiz' : 'quizzes'}
        </p>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={() => setBankOpen(true)}
            className='gap-1'
          >
            <Library className='w-4 h-4' /> Question Bank
          </Button>
          <Button
            variant='outline'
            onClick={() => setAiQuizOpen(true)}
            className='gap-1'
          >
            <Sparkles className='w-4 h-4' /> Generate with AI
          </Button>
          <Button onClick={() => setSettingsTarget('create')} className='gap-1'>
            <Plus className='w-4 h-4' /> New quiz
          </Button>
        </div>
      </div>

      {/* Bulk action bar — appears only when at least one quiz is selected.
          Sticky so it stays accessible as the teacher scrolls through many
          chapters. The "Select all" toggle picks every visible quiz; an
          empty selection collapses the bar. */}
      {selectedIds.size > 0 && (
        <div className='sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
          <div className='border rounded-xl p-2.5 shadow-sm bg-card flex items-center justify-between gap-3 flex-wrap'>
            <div className='flex items-center gap-3 min-w-0'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  // Select-all toggles between "all selected" and "none".
                  if (selectedIds.size === sorted.length) clearSelection();
                  else setSelectedIds(new Set(sorted.map((q) => q.id)));
                }}
                className='gap-1'
              >
                {selectedIds.size === sorted.length ? (
                  <CheckSquare className='w-4 h-4' />
                ) : (
                  <Square className='w-4 h-4' />
                )}
                {selectedIds.size === sorted.length ? 'Deselect all' : 'Select all'}
              </Button>
              <p className='text-sm tabular-nums'>
                {selectedIds.size} selected
              </p>
            </div>
            <div className='flex gap-2 flex-wrap'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkPublish(false)}
                className='gap-1'
              >
                <Check className='w-3.5 h-3.5' /> Publish
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkPublish(true)}
                className='gap-1'
              >
                Unpublish
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleBulkDelete}
                className='gap-1 text-destructive hover:text-destructive'
              >
                <Trash2 className='w-3.5 h-3.5' /> Delete
              </Button>
              <Button variant='ghost' size='sm' onClick={clearSelection}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <ListSkeleton variant='row' count={2} />}
      {!isLoading && sorted.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title='No quizzes yet'
          description='Create a quiz, add MCQ / True-False / Short-answer questions, then publish it.'
          actionLabel='New quiz'
          onAction={() => setSettingsTarget('create')}
        />
      )}

      {/* Quiz cards, optionally grouped under chapter headers. When the
          offering has no modules, or no quiz is filed under one, we fall
          back to a flat list so we don't render a useless single header. */}
      {showGrouped ? (
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
              <div className='space-y-2'>
                {qs.map((q) => (
                  <TeacherQuizCard
                    key={q.id}
                    quiz={q}
                    onSettings={() => setSettingsTarget(q)}
                    onEditQuestions={() => setEditingQuestions(q)}
                    onViewAttempts={() => setViewingAttempts(q)}
                    onDelete={() => undoDeleteQuiz(q)}
                    onTogglePublish={() => togglePublish(q)}
                    onDuplicate={() => handleDuplicate(q)}
                    onPreview={() => setPreviewing(q)}
                    selected={selectedIds.has(q.id)}
                    onToggleSelect={() => toggleSelect(q.id)}
                    anySelected={selectedIds.size > 0}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className='space-y-2'>
          {sorted.map((q) => (
            <TeacherQuizCard
              key={q.id}
              quiz={q}
              onSettings={() => setSettingsTarget(q)}
              onEditQuestions={() => setEditingQuestions(q)}
              onViewAttempts={() => setViewingAttempts(q)}
              onDelete={() => undoDeleteQuiz(q)}
              onTogglePublish={() => togglePublish(q)}
              onDuplicate={() => handleDuplicate(q)}
              onPreview={() => setPreviewing(q)}
              selected={selectedIds.has(q.id)}
              onToggleSelect={() => toggleSelect(q.id)}
              anySelected={selectedIds.size > 0}
            />
          ))}
        </div>
      )}

      <QuizSettingsDialog
        open={settingsTarget !== null}
        onOpenChange={(open) => !open && setSettingsTarget(null)}
        editing={
          liveSettingsTarget && liveSettingsTarget !== 'create'
            ? liveSettingsTarget
            : null
        }
        pending={createMutation.isPending || updateMutation.isPending}
        modules={modules}
        onSubmit={handleSettingsSubmit}
      />

      <QuestionBankManager
        open={bankOpen}
        onOpenChange={setBankOpen}
        courseOfferingId={courseId}
      />

      {/* AI "generate a whole quiz" flow. On success it creates a draft quiz
          (seeded with the kept questions) and drops the teacher straight into
          the builder to fine-tune + publish. */}
      <AiGenerateDialog
        open={aiQuizOpen}
        onOpenChange={setAiQuizOpen}
        courseOfferingId={courseId}
        destination={{ kind: 'new-quiz' }}
        onQuizCreated={(quiz) => setEditingQuestions(quiz)}
      />
    </div>
  );
}