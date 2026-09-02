'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { cn } from '@/lib/utils';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import {
  canPreviewQuizAsStudent,
  isQuizMissingBuiltQuestions,
  isUploadedOfflineQuiz,
  isUploadedQuizMissingPaper
} from '@/lib/course-details/services/quiz-total-points';
import { getQuizWindowState } from '../teacher-quiz-card/quiz-window-state';
import { QuizRowActions } from './quiz-row-actions';
import { quizAttemptCount, quizMarksLabel, quizMarksSubLabel, quizQuestionCount } from './quizzes-table-utils';

export function QuizListRow({
  quiz: q,
  col,
  courseMaxMarks,
  isSelected,
  onToggleSelect,
  onEditQuiz,
  onViewAttempts,
  onDelete,
  onTogglePublish,
  onDuplicate,
  onPreview
}: {
  quiz: Quiz;
  col: (id: string) => boolean;
  courseMaxMarks?: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEditQuiz: () => void;
  onViewAttempts: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
}) {
  const questionCount = quizQuestionCount(q);
  const attemptCount = quizAttemptCount(q);
  const pending = q.pendingGradingCount ?? 0;
  const missingQuestions = isQuizMissingBuiltQuestions(q);
  const missingPaper = isUploadedQuizMissingPaper(q);
  const previewDisabled = !canPreviewQuizAsStudent(q);
  const windowState = getQuizWindowState(q);

  return (
    <PosTableRow
      className={cn('group', isSelected && 'bg-primary/[0.04]', q.is_draft && 'bg-muted')}
    >
      <PosTableCell className='w-10'>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label={isSelected ? `Deselect ${q.title}` : `Select ${q.title}`}
          className='size-[18px] border-2 border-[#94A3B8] bg-card data-[state=checked]:border-primary'
        />
      </PosTableCell>

      {col('title') ? (
        <PosTableCell className='min-w-[220px] max-w-[380px] whitespace-normal'>
          <div className='space-y-0.5'>
            <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
              <span className='truncate text-sm font-medium'>{q.title}</span>
              {q.is_draft ? (
                <Badge variant='secondary' size='xs' className='rounded-full'>
                  Draft
                </Badge>
              ) : windowState ? (
                <Badge
                  variant={
                    windowState === 'closed'
                      ? 'destructive'
                      : windowState === 'open'
                        ? 'success'
                        : 'info'
                  }
                  size='xs'
                  className='rounded-full capitalize'
                >
                  {windowState}
                </Badge>
              ) : null}
              {missingQuestions ? (
                <Badge variant='warning' size='xs' className='rounded-full'>
                  No questions
                </Badge>
              ) : null}
              {missingPaper ? (
                <Badge variant='warning' size='xs' className='rounded-full'>
                  No file
                </Badge>
              ) : null}
              {isUploadedOfflineQuiz(q) && q.paperFile ? (
                <Badge variant='secondary' size='xs' className='rounded-full'>
                  Uploaded
                </Badge>
              ) : null}
              {q.mode === 'offline' ? (
                <Badge variant='outline' size='xs' className='rounded-full'>
                  Printed
                </Badge>
              ) : null}
            </div>
            {q.description ? (
              <p className='line-clamp-1 text-xs text-muted-foreground'>{q.description}</p>
            ) : null}
          </div>
        </PosTableCell>
      ) : null}

      {col('marks') ? (
        <PosTableCell>
          <div className='tabular-nums'>
            <span className='text-sm font-medium text-foreground'>
              {quizMarksLabel(q, courseMaxMarks)}
            </span>
            {quizMarksSubLabel(q) ? (
              <p className='text-xs text-muted-foreground'>{quizMarksSubLabel(q)}</p>
            ) : null}
          </div>
        </PosTableCell>
      ) : null}

      {col('questions') ? (
        <PosTableCell>
          <span
            className={cn(
              'text-sm tabular-nums',
              missingQuestions || missingPaper ? 'text-muted-foreground' : ''
            )}
          >
            {isUploadedOfflineQuiz(q) ? '—' : questionCount}
          </span>
        </PosTableCell>
      ) : null}

      {col('length') ? (
        <PosTableCell>
          <span className='text-sm text-muted-foreground tabular-nums'>
            {q.duration_minutes} min
          </span>
        </PosTableCell>
      ) : null}

      {col('attempts') ? (
        <PosTableCell align='right'>
          <div className='inline-flex flex-col items-end gap-0.5'>
            <span className='text-sm font-medium tabular-nums'>{attemptCount}</span>
            {pending > 0 ? (
              <span className='rounded-full bg-warning-muted px-2 py-0.5 text-[10px] font-medium text-warning-foreground'>
                {pending} to grade
              </span>
            ) : null}
          </div>
        </PosTableCell>
      ) : null}

      <PosTableCell align='right'>
        <QuizRowActions
          quiz={q}
          previewDisabled={previewDisabled}
          onEditQuiz={onEditQuiz}
          onViewAttempts={onViewAttempts}
          onDelete={onDelete}
          onTogglePublish={onTogglePublish}
          onDuplicate={onDuplicate}
          onPreview={onPreview}
        />
      </PosTableCell>
    </PosTableRow>
  );
}
