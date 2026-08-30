'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  FileText,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { DraftQuestionEditor } from '../quiz-builder/draft-question-editor';
import { questionTypesForMode } from '../quiz-question-types';
import { BasicsTab } from '../quiz-settings-form/basics-tab';
import { BehaviorTab } from '../quiz-settings-form/behavior-tab';
import type { QuizSettingsTab } from '../quiz-settings-form/form-state';
import { MarksTab } from '../quiz-settings-form/marks-tab';
import { ScheduleTab } from '../quiz-settings-form/schedule-tab';
import {
  quizFormCardClass,
  quizFormOutlineBtnClass,
  quizFormPrimaryBtnClass
} from './field-styles';
import { LocalQuestionList } from './local-question-list';
import { LocalSectionBlock } from './local-section-block';
import { QuizPreviewPanel } from './quiz-preview-panel';
import { useEditQuizPage } from './use-edit-quiz-page';

export function EditQuizPage({
  courseId,
  quiz,
  modules,
  onBack,
  onSaved
}: {
  courseId: string;
  quiz: Quiz;
  modules: CourseModule[];
  onBack: () => void;
  onSaved?: () => void;
}) {
  const p = useEditQuizPage(courseId, quiz, onSaved);
  const [configTab, setConfigTab] = useState<QuizSettingsTab>('basics');

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const isOffline = p.form.mode === 'offline';
  const typeOrder = questionTypesForMode(p.form.mode);

  useEffect(() => {
    if (isOffline && (configTab === 'schedule' || configTab === 'behavior')) {
      setConfigTab('basics');
    }
  }, [isOffline, configTab]);

  const sectioned = p.selectedTypes.length > 0;
  const visibleTypes = typeOrder.filter((t) => p.selectedTypes.includes(t));
  const draftOwnedBySection =
    p.draft != null &&
    p.lockedAddType != null &&
    sectioned &&
    visibleTypes.includes(p.lockedAddType);

  const entries = p.questionDrafts.map((draft, index) => ({ index, draft }));
  const otherEntries = entries.filter(
    ({ draft }) => !sectioned || !p.selectedTypes.includes(draft.question_type)
  );

  const previewQuestions = useMemo(
    () => p.questionDrafts,
    [p.questionDrafts]
  );

  const inlineDraftProps = p.draft
    ? {
        draft: p.draft,
        setDraft: p.setDraft,
        setType: p.setType,
        updateOption: p.updateOption,
        addOption: p.addOption,
        removeOption: p.removeOption,
        setCorrectExclusive: p.setCorrectExclusive,
        onCancel: p.cancelDraft,
        onSave: p.saveDraft,
        isSaving: p.questionSavePending
      }
    : null;

  const content = (
    <div className='fixed inset-0 z-[100] overflow-y-auto bg-[#f8f9fb] text-foreground'>
      <div className='mx-auto max-w-[1400px] space-y-5 p-4 pb-24 sm:p-6'>
        <header className='flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            <Button
              variant='ghost'
              onClick={onBack}
              className='-ml-2 mb-1 h-9 gap-1 text-sm text-primary hover:bg-secondary hover:text-primary'
            >
              <ArrowLeft className='size-4' /> Quizzes
            </Button>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-2xl font-semibold tracking-tight text-foreground'>
                {p.form.title.trim() || quiz.title}
              </h1>
              <Badge variant={p.form.is_draft ? 'secondary' : 'default'}>
                {p.form.is_draft ? 'Draft' : 'Published'}
              </Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground tabular-nums'>
              {p.questions.length} question{p.questions.length === 1 ? '' : 's'} ·{' '}
              {p.totalPoints} pt total · {p.form.duration_minutes} min
              {sectioned
                ? ` · ${visibleTypes.length} section${visibleTypes.length === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Button
              variant='outline'
              className={quizFormOutlineBtnClass}
              onClick={onBack}
              disabled={p.isSaving}
            >
              Cancel
            </Button>
            <Button
              className={quizFormPrimaryBtnClass}
              onClick={p.handleSave}
              disabled={p.isSaving || p.draft != null}
            >
              {p.isSaving ? 'Saving…' : 'Save quiz'}
            </Button>
          </div>
        </header>

        <div
          className={
            isOffline
              ? 'grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_420px]'
              : 'grid grid-cols-1 items-start gap-4'
          }
        >
          <div className='min-w-0 space-y-4'>
            <div className={quizFormCardClass}>
              <Tabs
                value={configTab}
                onValueChange={(v) => setConfigTab(v as QuizSettingsTab)}
              >
                <TabsList
                  className={`grid h-11 w-full rounded-full border border-border/90 bg-card p-1 text-sm ${
                    isOffline ? 'grid-cols-2' : 'grid-cols-3'
                  }`}
                >
                  <TabsTrigger
                    value='basics'
                    className='gap-1.5 rounded-full text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                  >
                    <FileText className='size-3.5' /> Basics
                  </TabsTrigger>
                  {!isOffline ? (
                    <TabsTrigger
                      value='schedule'
                      className='gap-1.5 rounded-full text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                    >
                      <Calendar className='size-3.5' /> Timing
                    </TabsTrigger>
                  ) : null}
                  <TabsTrigger
                    value='marks'
                    className='gap-1.5 rounded-full text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                  >
                    <ClipboardCheck className='size-3.5' /> Marking
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='basics' className='mt-5'>
                  <BasicsTab form={p.form} setForm={p.setForm} modules={modules} />
                </TabsContent>

                {!isOffline ? (
                  <TabsContent value='schedule' className='mt-5 space-y-5'>
                    <ScheduleTab form={p.form} setForm={p.setForm} withDuration />
                    <div className='border-t border-border pt-5'>
                      <BehaviorTab form={p.form} setForm={p.setForm} hideDuration />
                    </div>
                  </TabsContent>
                ) : null}

                <TabsContent value='marks' className='mt-5'>
                  <MarksTab form={p.form} setForm={p.setMarksForm} />
                </TabsContent>
              </Tabs>
            </div>

            <div className={`space-y-4 ${quizFormCardClass}`}>
              <div>
                <h2 className='text-base font-semibold text-foreground'>Questions</h2>
                <p className='text-sm text-muted-foreground'>
                  {p.questions.length === 0
                    ? 'Add at least one question before publishing.'
                    : `${p.questions.length} question${p.questions.length === 1 ? '' : 's'} · ${p.totalPoints} points`}
                </p>
              </div>

              {!sectioned && p.canAddQuestions ? (
                <Button
                  variant='outline'
                  className={`${quizFormOutlineBtnClass} gap-1.5`}
                  onClick={p.startNew}
                  disabled={p.draft != null}
                >
                  <Plus className='size-4' /> Add Question
                </Button>
              ) : null}

              {!p.canAddQuestions ? (
                <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'>
                  {p.addLockedTitle}
                </p>
              ) : null}

              {sectioned && (
                <div className='space-y-3'>
                  {visibleTypes.map((type) => {
                    const typeEntries = entries.filter(
                      ({ draft }) => draft.question_type === type
                    );
                    return (
                      <LocalSectionBlock
                        key={type}
                        type={type}
                        targetMarks={p.allocations[type] ?? 0}
                        entries={typeEntries}
                        draftOpen={p.draft != null}
                        editingIndex={p.editingIndex}
                        onAdd={() => p.startNewForSection(type)}
                        onEdit={p.startEdit}
                        onDelete={p.deleteQuestion}
                        quizMode={p.form.mode}
                        inlineDraft={
                          p.draft && p.lockedAddType === type ? inlineDraftProps : null
                        }
                      />
                    );
                  })}
                </div>
              )}

              {(!sectioned || otherEntries.length > 0) && (
                <div className={sectioned ? 'space-y-2' : ''}>
                  {sectioned && (
                    <h3 className='text-sm font-semibold text-muted-foreground'>
                      Other questions (not part of a planned section)
                    </h3>
                  )}
                  <LocalQuestionList
                    entries={otherEntries}
                    draftOpen={p.draft != null}
                    editingIndex={p.editingIndex}
                    onEdit={p.startEdit}
                    onDelete={p.deleteQuestion}
                    quizMode={p.form.mode}
                    inlineDraft={
                      p.draft && p.editingIndex != null && !draftOwnedBySection
                        ? inlineDraftProps
                        : null
                    }
                    mode='edit'
                  />
                </div>
              )}

              {p.draft && !draftOwnedBySection && p.editingIndex == null ? (
                <DraftQuestionEditor
                  {...inlineDraftProps!}
                  lockType={false}
                  quizMode={p.form.mode}
                />
              ) : null}
            </div>
          </div>

          {isOffline ? (
            <QuizPreviewPanel
              title={p.form.title}
              description={p.form.description}
              mode={p.form.mode}
              is_draft={p.form.is_draft}
              duration_minutes={p.form.duration_minutes}
              passing_score={p.form.passing_score}
              questions={previewQuestions}
              totalPoints={p.totalPoints}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
