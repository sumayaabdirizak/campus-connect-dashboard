'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ClipboardList,
  FileUp,
  ListChecks,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { DraftQuestionEditor } from '../quiz-builder/draft-question-editor';
import type { QuizQuestionType } from '../quiz-builder/types';
import { BasicsTab } from '../quiz-settings-form/basics-tab';
import { BehaviorTab } from '../quiz-settings-form/behavior-tab';
import { DurationField } from '../quiz-settings-form/duration-field';
import { MarksTab } from '../quiz-settings-form/marks-tab';
import { ScheduleTab } from '../quiz-settings-form/schedule-tab';
import { InlineAiGenerate } from './inline-ai-generate';
import { LocalCsvImportDialog } from './local-csv-import-dialog';
import { LocalQuestionList } from './local-question-list';
import { LocalSectionBlock } from './local-section-block';
import { QuizPreviewPanel } from './quiz-preview-panel';
import { useNewQuizPage } from './use-new-quiz-page';

const TYPE_ORDER: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'];

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

  const sectioned = p.selectedTypes.length > 0;
  const otherEntries = p.questions
    .map((draft, index) => ({ index, draft }))
    .filter(({ draft }) => !sectioned || !p.selectedTypes.includes(draft.question_type));
  // Keeps exactly one editing surface active at a time — the inline AI
  // panel, the manual question editor, and the section "Add Question"
  // triggers would otherwise all fight for the same space in the card.
  const anyEditorOpen = p.draft != null || p.aiOpen;

  const content = (
    <div className='fixed inset-0 z-[100] bg-background overflow-y-auto'>
      <div className='max-w-[1400px] mx-auto p-4 sm:p-6 space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <Button variant='ghost' onClick={onBack} className='gap-1 -ml-2'>
          <ArrowLeft className='w-4 h-4' /> Back to quizzes
        </Button>
        <Button variant='ghost' size='icon' onClick={onBack} aria-label='Close'>
          <X className='w-5 h-5' />
        </Button>
      </div>

      <div className='flex items-center gap-3'>
        <span className='shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-accent text-accent-foreground'>
          <ClipboardList className='w-5 h-5' />
        </span>
        <div>
          <h1 className='text-xl font-bold'>Add new quiz</h1>
          <p className='text-sm text-muted-foreground'>
            Configure the quiz and add its questions, then create it in one step.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 items-start'>
        <div className='space-y-4 min-w-0'>
      {/* Step 1 — configuration */}
      <div className='border rounded-xl p-4 bg-card shadow-sm space-y-3'>
        <div className='flex items-center gap-2'>
          <span className='grid place-items-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0'>
            1
          </span>
          <h2 className='font-semibold'>Quiz configuration</h2>
        </div>

        <Tabs value={p.tab} onValueChange={(v) => p.setTab(v as typeof p.tab)}>
          <TabsList className='grid grid-cols-2 w-full'>
            <TabsTrigger value='setup' className='gap-1'>
              <Settings2 className='w-3.5 h-3.5' /> Setup
            </TabsTrigger>
            <TabsTrigger value='advanced' className='gap-1'>
              <SlidersHorizontal className='w-3.5 h-3.5' /> Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value='setup' className='space-y-4'>
            <BasicsTab form={p.form} setForm={p.setForm} modules={modules} />
            <div className='border-t pt-4'>
              <DurationField form={p.form} setForm={p.setForm} />
            </div>
            <div className='border-t pt-4'>
              <ScheduleTab form={p.form} setForm={p.setForm} />
            </div>
          </TabsContent>
          <TabsContent value='advanced' className='space-y-4'>
            <BehaviorTab form={p.form} setForm={p.setForm} hideDuration />
            <div className='border-t pt-4'>
              <MarksTab form={p.form} setForm={p.setForm} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Step 2 — questions */}
      <div className='border rounded-xl p-4 bg-card shadow-sm space-y-3'>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <div className='flex items-center gap-2'>
            <span className='grid place-items-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0'>
              2
            </span>
            <h2 className='font-semibold'>Add questions</h2>
            {p.questions.length > 0 ? (
              <Badge variant='secondary' size='xs' className='rounded-full gap-1'>
                <ListChecks className='w-3 h-3' />
                {p.questions.length} question{p.questions.length === 1 ? '' : 's'} ·{' '}
                {p.totalPoints} pt
              </Badge>
            ) : null}
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='gap-1'
              onClick={() => p.setCsvOpen(true)}
              disabled={anyEditorOpen}
            >
              <FileUp className='w-3.5 h-3.5' /> Import CSV
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1'
              onClick={() => p.setAiOpen(true)}
              disabled={anyEditorOpen}
            >
              <Sparkles className='w-3.5 h-3.5' /> Generate with AI
            </Button>
          </div>
        </div>

        {p.aiOpen ? (
          <InlineAiGenerate
            courseOfferingId={courseId}
            onAdd={p.addQuestions}
            onClose={() => p.setAiOpen(false)}
            lockedQuestionTypes={sectioned ? p.selectedTypes : undefined}
          />
        ) : null}

        {sectioned && (
          <div className='space-y-3'>
            {TYPE_ORDER.filter((t) => p.selectedTypes.includes(t)).map((type) => {
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
              questions={otherEntries.map((e) => e.draft)}
              draftOpen={anyEditorOpen}
              onEdit={(i) => p.startEdit(otherEntries[i].index)}
              onDelete={(i) => p.deleteQuestion(otherEntries[i].index)}
            />
          </div>
        )}

        {p.draft && p.lockedAddType === null ? (
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
          />
        ) : null}
      </div>

      <div className='flex justify-end gap-2 pb-4'>
        <Button variant='outline' onClick={onBack} disabled={p.isCreating}>
          Cancel
        </Button>
        <Button onClick={p.handleCreate} disabled={p.isCreating || p.draft != null} size='lg'>
          {p.isCreating ? 'Creating…' : 'Create Quiz'}
        </Button>
      </div>
        </div>

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
      </div>

      <LocalCsvImportDialog
        open={p.csvOpen}
        onOpenChange={p.setCsvOpen}
        onImport={p.addQuestions}
      />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
