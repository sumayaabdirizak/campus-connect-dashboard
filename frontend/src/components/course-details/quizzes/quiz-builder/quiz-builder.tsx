'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AiGenerateDialog } from '../ai-generate-dialog';
import { QuizCsvDialog } from '../quiz-csv-dialog';
import { DraftQuestionEditor } from './draft-question-editor';
import { QuizBuilderHeader } from './quiz-builder-header';
import { QuizQuestionList } from './quiz-question-list';
import { QuizSectionBlock } from './quiz-section-block';
import type { QuizBuilderProps, QuizQuestionType } from './types';
import { useQuizBuilder } from './use-quiz-builder';

const TYPE_ORDER: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'];

export function QuizBuilder({ courseId, quiz, onBack }: QuizBuilderProps) {
  const b = useQuizBuilder(courseId, quiz);

  // The marks plan itself is configured in Quiz Settings → Marks (persisted
  // on the quiz record) — this page only reads it back to decide which
  // section blocks to render. No local plan-editing state here anymore.
  const selectedTypes = quiz.marksPlan
    ? (Object.keys(quiz.marksPlan.allocations) as QuizQuestionType[])
    : [];
  const allocations = quiz.marksPlan?.allocations ?? {};

  // Tracks whether the open draft was started from a section's own "Add
  // Question" button, so the editor can pin its Type field to that section.
  const [lockedAddType, setLockedAddType] = useState<QuizQuestionType | null>(null);

  const startNewForSection = (type: QuizQuestionType) => {
    setLockedAddType(type);
    b.startNew(type);
  };
  const startEditGeneral = (q: Parameters<typeof b.startEdit>[0]) => {
    // Editing a question that belongs to a planned section must reopen
    // inside that section's own inline editor (locked type + marks-budget
    // cap) rather than the general editor at the bottom of the page —
    // otherwise the section's `maxPoints` guard never applies to edits.
    setLockedAddType(selectedTypes.includes(q.question_type) ? q.question_type : null);
    b.startEdit(q);
  };
  const cancelDraft = () => {
    setLockedAddType(null);
    b.cancel();
  };

  const sectioned = selectedTypes.length > 0;
  const otherQuestions = sectioned
    ? b.questions.filter((q) => !selectedTypes.includes(q.question_type))
    : b.questions;

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack} className='gap-1 -ml-2'>
        <ArrowLeft className='w-4 h-4' /> Back to quizzes
      </Button>

      <QuizBuilderHeader
        quiz={quiz}
        questions={b.questions}
        questionCount={b.questions.length}
        totalPoints={b.totalPoints}
        canAddQuestions={b.canAddQuestions}
        addLockedTitle={b.addLockedTitle}
        draftOpen={b.draft != null}
        onCsv={() => b.setCsvOpen(true)}
        onAi={() => b.setAiOpen(true)}
        onAdd={() => {
          setLockedAddType(null);
          b.startNew();
        }}
      />

      {sectioned && (
        <div className='space-y-3'>
          {TYPE_ORDER.filter((t) => selectedTypes.includes(t)).map((type) => (
            <QuizSectionBlock
              key={type}
              type={type}
              targetMarks={allocations[type] ?? 0}
              questions={b.questions.filter((q) => q.question_type === type)}
              canAddQuestions={b.canAddQuestions}
              addLockedTitle={b.addLockedTitle}
              draftOpen={b.draft != null}
              deletePending={b.deleteMutation.isPending}
              onAdd={() => startNewForSection(type)}
              onEdit={startEditGeneral}
              onDelete={b.handleDelete}
              // Pass the inline editor only when this section owns the active draft
              inlineDraft={
                b.draft && lockedAddType === type ? {
                  draft: b.draft,
                  setDraft: b.setDraft,
                  setType: b.setType,
                  updateOption: b.updateOption,
                  addOption: b.addOption,
                  removeOption: b.removeOption,
                  setCorrectExclusive: b.setCorrectExclusive,
                  onCancel: cancelDraft,
                  onSave: b.save,
                  isSaving: b.createMutation.isPending || b.updateMutation.isPending,
                } : null
              }
            />
          ))}
        </div>
      )}

      {(!sectioned || otherQuestions.length > 0) && (
        <div className={sectioned ? 'space-y-2' : ''}>
          {sectioned && (
            <h3 className='text-sm font-semibold text-muted-foreground'>
              Other questions (not part of a planned section)
            </h3>
          )}
          <QuizQuestionList
            questions={otherQuestions}
            canAddQuestions={b.canAddQuestions}
            draftOpen={b.draft != null}
            deletePending={b.deleteMutation.isPending}
            onDragEnd={b.handleDragEnd}
            onEdit={startEditGeneral}
            onDelete={b.handleDelete}
          />
        </div>
      )}

      {/* General editor: only shown when draft was NOT opened from a section button */}
      {b.draft && lockedAddType === null ? (
        <DraftQuestionEditor
          draft={b.draft}
          setDraft={b.setDraft}
          setType={b.setType}
          updateOption={b.updateOption}
          addOption={b.addOption}
          removeOption={b.removeOption}
          setCorrectExclusive={b.setCorrectExclusive}
          onCancel={cancelDraft}
          onSave={b.save}
          isSaving={b.createMutation.isPending || b.updateMutation.isPending}
          lockType={false}
        />
      ) : null}

      <AiGenerateDialog
        open={b.aiOpen}
        onOpenChange={b.setAiOpen}
        courseOfferingId={courseId}
        destination={{ kind: 'quiz', quizId: quiz.id }}
      />
      <QuizCsvDialog
        open={b.csvOpen}
        onOpenChange={b.setCsvOpen}
        courseOfferingId={courseId}
        quizId={quiz.id}
        quizTitle={quiz.title}
        canUpload={b.canAddQuestions}
      />
    </div>
  );
}
