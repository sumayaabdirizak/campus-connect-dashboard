'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FileSpreadsheet,
  Library,
  Plus,
  Sparkles
} from 'lucide-react';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';

interface QuizBuilderHeaderProps {
  quiz: Quiz;
  questionCount: number;
  totalPoints: number;
  canAddQuestions: boolean;
  addLockedTitle: string;
  draftOpen: boolean;
  onCsv: () => void;
  onAi: () => void;
  onBank: () => void;
  onAdd: () => void;
}

export function QuizBuilderHeader({
  quiz,
  questionCount,
  totalPoints,
  canAddQuestions,
  addLockedTitle,
  draftOpen,
  onCsv,
  onAi,
  onBank,
  onAdd
}: QuizBuilderHeaderProps) {
  return (
    <>
      <div className='border rounded-xl p-4 flex items-start justify-between gap-3 bg-muted/30'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h2 className='text-xl font-bold truncate'>{quiz.title}</h2>
            {quiz.is_draft ? <Badge variant='secondary'>Draft</Badge> : null}
            {!quiz.is_draft ? <Badge variant='outline'>Published</Badge> : null}
          </div>
          <p className='text-sm text-muted-foreground mt-1 tabular-nums'>
            {questionCount} question{questionCount === 1 ? '' : 's'} · {totalPoints} pt
            total · {quiz.duration_minutes} min · pass ≥ {quiz.passing_score}%
          </p>
        </div>
        <div className='flex gap-2 shrink-0 flex-wrap'>
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
            variant='outline'
            onClick={onBank}
            className='gap-1'
            disabled={draftOpen || !canAddQuestions}
            title={canAddQuestions ? undefined : addLockedTitle}
          >
            <Library className='w-4 h-4' /> Add from Bank
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
        <div className='flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/30'>
          <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-600' />
          <p className='text-amber-900 dark:text-amber-200'>
            This quiz is <strong>published</strong> and visible to students. You can review
            questions here, but you cannot add, upload, or import new ones until you switch
            it back to <strong>draft</strong>.
          </p>
        </div>
      ) : null}
    </>
  );
}
