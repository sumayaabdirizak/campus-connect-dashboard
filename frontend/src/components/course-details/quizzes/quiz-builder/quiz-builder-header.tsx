'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  Plus,
  Printer,
  Sparkles
} from 'lucide-react';
import type { Quiz, QuizQuestion } from '@/lib/course-details/services/quizzes-types';
import { printOfflineQuiz } from './print-offline-quiz';

interface QuizBuilderHeaderProps {
  quiz: Quiz;
  questions: QuizQuestion[];
  questionCount: number;
  totalPoints: number;
  canAddQuestions: boolean;
  addLockedTitle: string;
  draftOpen: boolean;
  onCsv: () => void;
  onAi: () => void;
  onAdd: () => void;
}

export function QuizBuilderHeader({
  quiz,
  questions,
  questionCount,
  totalPoints,
  canAddQuestions,
  addLockedTitle,
  draftOpen,
  onCsv,
  onAi,
  onAdd
}: QuizBuilderHeaderProps) {
  return (
    <>
      <div className='border rounded-xl p-4 flex items-start justify-between gap-3 bg-card shadow-sm'>
        <div className='min-w-0 flex items-start gap-3'>
          <span className='shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-accent text-accent-foreground'>
            <ClipboardList className='w-5 h-5' />
          </span>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h2 className='text-xl font-bold truncate'>{quiz.title}</h2>
              {quiz.is_draft ? (
                <Badge variant='secondary' size='xs' className='rounded-full'>
                  Draft
                </Badge>
              ) : (
                <Badge variant='success' size='xs' className='rounded-full'>
                  Published
                </Badge>
              )}
            </div>
            <p className='text-sm text-muted-foreground mt-1 tabular-nums'>
              {questionCount} question{questionCount === 1 ? '' : 's'} · {totalPoints} pt
              total · {quiz.duration_minutes} min · pass ≥ {quiz.passing_score}%
            </p>
          </div>
        </div>
        <div className='flex gap-2 shrink-0 flex-wrap'>
          {quiz.mode === 'offline' && (
            <Button
              variant='outline'
              onClick={() => printOfflineQuiz(quiz, questions)}
              className='gap-1'
              disabled={questionCount === 0}
              title={questionCount === 0 ? 'Add questions before printing' : 'Print offline handout'}
            >
              <Printer className='w-4 h-4' /> Print
            </Button>
          )}
          <Button
            variant='outline'
            size='icon'
            onClick={onCsv}
            disabled={draftOpen}
            aria-label='Import / export CSV'
            title={
              canAddQuestions
                ? 'Import / export CSV'
                : 'Download CSV (upload disabled while published)'
            }
          >
            <FileSpreadsheet className='w-4 h-4' />
          </Button>
          <Button
            variant='outline'
            onClick={onAi}
            className='gap-1'
            disabled={draftOpen || !canAddQuestions}
            title={canAddQuestions ? undefined : addLockedTitle}
          >
            <Sparkles className='w-4 h-4' /> Generate with AI
          </Button>
          <Button
            onClick={onAdd}
            className='gap-1'
            disabled={draftOpen || !canAddQuestions}
            title={canAddQuestions ? undefined : addLockedTitle}
          >
            <Plus className='w-4 h-4' /> Add question
          </Button>
        </div>
      </div>

      {!canAddQuestions ? (
        <div className='flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-muted p-3 text-sm'>
          <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-warning-foreground' />
          <p className='text-warning-foreground'>
            This quiz is <strong>published</strong> and visible to students. You can review
            questions here, but you cannot add, upload, or import new ones until you switch
            it back to <strong>draft</strong>.
          </p>
        </div>
      ) : null}
    </>
  );
}
