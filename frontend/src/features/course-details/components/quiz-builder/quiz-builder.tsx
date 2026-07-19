'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AddFromBankDialog } from '../add-from-bank-dialog';
import { AiGenerateDialog } from '../ai-generate-dialog';
import { QuizCsvDialog } from '../quiz-csv-dialog';
import { DraftQuestionEditor } from './draft-question-editor';
import { QuizBuilderHeader } from './quiz-builder-header';
import { QuizQuestionList } from './quiz-question-list';
import type { QuizBuilderProps } from './types';
import { useQuizBuilder } from './use-quiz-builder';

export function QuizBuilder({ courseId, quiz, onBack }: QuizBuilderProps) {
  const b = useQuizBuilder(courseId, quiz);

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack} className='gap-1 -ml-2'>
        <ArrowLeft className='w-4 h-4' /> Back to quizzes
      </Button>

      <QuizBuilderHeader
        quiz={quiz}
        questionCount={b.questions.length}
        totalPoints={b.totalPoints}
        canAddQuestions={b.canAddQuestions}
        addLockedTitle={b.addLockedTitle}
        draftOpen={b.draft != null}
        onCsv={() => b.setCsvOpen(true)}
        onAi={() => b.setAiOpen(true)}
        onBank={() => b.setBankPickerOpen(true)}
        onAdd={b.startNew}
      />

      <QuizQuestionList
        questions={b.questions}
        canAddQuestions={b.canAddQuestions}
        draftOpen={b.draft != null}
        deletePending={b.deleteMutation.isPending}
        onDragEnd={b.handleDragEnd}
        onEdit={b.startEdit}
        onDelete={b.handleDelete}
      />

      {b.draft ? (
        <DraftQuestionEditor
          draft={b.draft}
          setDraft={b.setDraft}
          setType={b.setType}
          updateOption={b.updateOption}
          addOption={b.addOption}
          removeOption={b.removeOption}
          setCorrectExclusive={b.setCorrectExclusive}
          onCancel={b.cancel}
          onSave={b.save}
          isSaving={b.createMutation.isPending || b.updateMutation.isPending}
        />
      ) : null}

      <AddFromBankDialog
        open={b.bankPickerOpen}
        onOpenChange={b.setBankPickerOpen}
        courseOfferingId={courseId}
        quizId={quiz.id}
      />
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
