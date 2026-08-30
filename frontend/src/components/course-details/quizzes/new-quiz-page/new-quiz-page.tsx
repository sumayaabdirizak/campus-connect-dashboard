'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  FileText,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import type { AiSectionPlanItem } from '../ai-generate-dialog/section-plan';
import {
  quizFormCardClass,
  quizFormOutlineBtnClass,
  quizFormPrimaryBtnClass
} from './field-styles';
import { DraftQuestionEditor } from '../quiz-builder/draft-question-editor';
import { questionTypesForMode } from '../quiz-question-types';
import { BasicsTab } from '../quiz-settings-form/basics-tab';
import { BehaviorTab } from '../quiz-settings-form/behavior-tab';
import {
  isQuizConfigReady,
  quizConfigReadyMessage,
  type QuizSettingsTab
} from '../quiz-settings-form/form-state';
import { MarksTab } from '../quiz-settings-form/marks-tab';
import { ScheduleTab } from '../quiz-settings-form/schedule-tab';
import { InlineAiGenerate } from './inline-ai-generate';
import { LocalQuestionList } from './local-question-list';
import { LocalSectionBlock } from './local-section-block';
import { QuizPreviewPanel } from './quiz-preview-panel';
import { useNewQuizPage } from './use-new-quiz-page';

export function NewQuizPage({
  courseId,
  modules,
  onBack,
  onCreated
}: {
  courseId: string;
  modules: CourseModule[];
  onBack: () => void;
  onCreated: (quiz: Quiz) => void;
}) {
  const p = useNewQuizPage(courseId, onCreated);
  const [configTab, setConfigTab] = useState<QuizSettingsTab>('basics');

  // Escapes the dashboard's sidebar/topbar chrome — this flow is big enough
  // (config + live question sections + preview panel) that it deserves the
  // full viewport, not just the course tab's content column.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const isOffline = p.form.mode === 'offline';
  const typeOrder = questionTypesForMode(p.form.mode);

  // Timing (schedule + shuffle) only applies to online quizzes — drop back
  // to Basics if the teacher switches to printed while that tab is open.
  useEffect(() => {
    if (isOffline && (configTab === 'schedule' || configTab === 'behavior')) {
      setConfigTab('basics');
    }
  }, [isOffline, configTab]);

  const sectioned = p.selectedTypes.length > 0;
  const configReady = isQuizConfigReady(p.form);
  const configBlockedReason = quizConfigReadyMessage(p.form);
  const visibleTypes = typeOrder.filter((t) => p.selectedTypes.includes(t));

  // Close the AI panel if the teacher clears required settings mid-flow.
  useEffect(() => {
    if (!configReady && p.aiOpen) {
      p.setAiOpen(false);
    }
  }, [configReady, p.aiOpen, p.setAiOpen]);

  const aiSectionPlan = useMemo<AiSectionPlanItem[] | undefined>(() => {
    if (p.selectedTypes.length === 0) return undefined;
    const types = typeOrder.filter((t) => p.selectedTypes.includes(t));
    return types.map((type) => {
      const marks = p.allocations[type] ?? 0;
      const used = p.questions
        .filter((q) => q.question_type === type)
        .reduce((sum, q) => sum + (Number(q.points) || 0), 0);
      return {
        type,
        marks,
        remainingMarks: Math.max(0, marks - used)
      };
    });
  }, [p.selectedTypes, p.allocations, p.questions, typeOrder]);
  // An open draft is normally rendered by the section that owns its type.
  // If that section is not on screen — the teacher unchecked the type in
  // Marking while the editor was open — the draft would otherwise render
  // nowhere while still counting as "an editor is open", silently disabling
  // Edit, Add Question and Create with AI with no visible reason why.
  const draftOwnedBySection =
    p.draft != null &&
    p.lockedAddType != null &&
    sectioned &&
    visibleTypes.includes(p.lockedAddType);
  const otherEntries = p.questions
    .map((draft, index) => ({ index, draft }))
    .filter(({ draft }) => !sectioned || !p.selectedTypes.includes(draft.question_type));
  // Keeps exactly one editing surface active at a time — the inline AI
  // panel, the manual question editor, and the section "Add Question"
  // triggers would otherwise all fight for the same space in the card.
  const anyEditorOpen = p.draft != null || p.aiOpen;

  const content = (
    <div className='fixed inset-0 z-[100] overflow-y-auto bg-[#f8f9fb] text-foreground'>
      <div className='mx-auto max-w-[1400px] space-y-5 p-4 pb-24 sm:p-6'>
      <header className='flex items-center justify-between gap-3'>
        <div className='min-w-0'>
          <Button variant='ghost' onClick={onBack} className='-ml-2 mb-1 h-9 gap-1 text-sm text-primary hover:bg-secondary hover:text-primary'>
            <ArrowLeft className='size-4' /> Quizzes
          </Button>
          <h1 className='text-2xl font-semibold tracking-tight text-foreground'>Create a quiz</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Name it, set the time, then add questions.
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button variant='outline' className={quizFormOutlineBtnClass} onClick={onBack} disabled={p.isCreating}>
            Cancel
          </Button>
          <Button
            className={quizFormPrimaryBtnClass}
            onClick={p.handleCreate}
            disabled={p.isCreating || p.draft != null || p.questions.length === 0}
            title={
              p.questions.length === 0
                ? 'Add at least one question with Create with AI first'
                : p.draft != null
                  ? 'Save or cancel the open question editor first'
                  : undefined
            }
          >
            {p.isCreating ? 'Creating…' : 'Create quiz'}
          </Button>
        </div>
      </header>

      <div
        className={
          isOffline
            ? 'grid grid-cols-1 gap-4 items-start lg:grid-cols-[1fr_420px]'
            : 'grid grid-cols-1 gap-4 items-start'
        }
      >
        <div className='space-y-4 min-w-0'>
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
            <TabsTrigger value='basics' className='gap-1.5 rounded-full text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'>
              <FileText className='size-3.5' /> Basics
            </TabsTrigger>
            {!isOffline ? (
              <TabsTrigger value='schedule' className='gap-1.5 rounded-full text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'>
                <Calendar className='size-3.5' /> Timing
              </TabsTrigger>
            ) : null}
            <TabsTrigger value='marks' className='gap-1.5 rounded-full text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'>
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
            <MarksTab form={p.form} setForm={p.setForm} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Questions */}
      <div className={`space-y-4 ${quizFormCardClass}`}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-base font-semibold text-foreground'>Questions</h2>
            <p className='text-sm text-muted-foreground'>
              {p.questions.length === 0
                ? configReady
                  ? 'Use Create with AI to generate questions for this quiz.'
                  : 'Finish Basics and Marking above, then create questions with AI.'
                : `${p.questions.length} question${p.questions.length === 1 ? '' : 's'} · ${p.totalPoints} points`}
            </p>
          </div>
          <Button
            className={`${quizFormPrimaryBtnClass} gap-1.5`}
            onClick={() => p.setAiOpen(true)}
            disabled={!configReady || anyEditorOpen}
            title={
              !configReady
                ? (configBlockedReason ?? undefined)
                : anyEditorOpen
                  ? 'Finish or close the open editor first'
                  : undefined
            }
          >
            <Sparkles className='size-4' /> Create with AI
          </Button>
        </div>

        {!configReady && !p.aiOpen ? (
          <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'>
            {configBlockedReason}
          </p>
        ) : null}

        {p.aiOpen ? (
          <InlineAiGenerate
            courseOfferingId={courseId}
            onAdd={p.addQuestions}
            onClose={() => p.setAiOpen(false)}
            lockedQuestionTypes={sectioned ? p.selectedTypes : undefined}
            sectionPlan={aiSectionPlan}
            quizMode={p.form.mode}
          />
        ) : null}

        {sectioned && (
          <div className='space-y-3'>
            {visibleTypes.map((type) => {
              const entries = p.questions
                .map((draft, index) => ({ index, draft }))
                .filter(({ draft }) => draft.question_type === type);
              return (
                <LocalSectionBlock
                  key={type}
                  type={type}
                  targetMarks={p.allocations[type] ?? 0}
                  entries={entries}
                  draftOpen={anyEditorOpen}
                  editingIndex={p.editingIndex}
                  onAdd={() => p.startNewForSection(type)}
                  onEdit={p.startEdit}
                  onDelete={p.deleteQuestion}
                  quizMode={p.form.mode}
                  showAddButton={false}
                  inlineDraft={
                    p.draft && p.lockedAddType === type
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
                          isSaving: false
                        }
                      : null
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
              draftOpen={anyEditorOpen}
              editingIndex={p.editingIndex}
              onEdit={p.startEdit}
              onDelete={p.deleteQuestion}
              quizMode={p.form.mode}
              inlineDraft={
                p.draft && p.editingIndex != null && !draftOwnedBySection
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
                      isSaving: false
                    }
                  : null
              }
            />
          </div>
        )}

        {/* New question only — edits render in place on the row above. */}
        {p.draft && !draftOwnedBySection && p.editingIndex == null ? (
          <DraftQuestionEditor
            draft={p.draft}
            setDraft={p.setDraft}
            setType={p.setType}
            updateOption={p.updateOption}
            addOption={p.addOption}
            removeOption={p.removeOption}
            setCorrectExclusive={p.setCorrectExclusive}
            onCancel={p.cancelDraft}
            onSave={p.saveDraft}
            isSaving={false}
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
            questions={p.questions}
            totalPoints={p.totalPoints}
          />
        ) : null}
      </div>

      </div>
    </div>
  );

  return createPortal(content, document.body);
}
