'use client';

import { Check, Download, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import type { DraftQuestion } from '../quiz-builder/types';
import { downloadQuizPreview, printQuizPreview, type QuizPreviewData } from './build-quiz-preview-html';

const TYPE_LABEL: Record<DraftQuestion['question_type'], string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};

export function QuizPreviewPanel({
  title,
  description,
  mode,
  is_draft,
  duration_minutes,
  passing_score,
  questions,
  totalPoints
}: {
  title: string;
  description: string;
  mode: 'online' | 'offline';
  is_draft: boolean;
  duration_minutes: number;
  passing_score: number;
  questions: DraftQuestion[];
  totalPoints: number;
}) {
  const user = useAuthStore((s) => s.user);

  const previewData: QuizPreviewData = {
    title,
    description,
    mode,
    is_draft,
    duration_minutes,
    passing_score,
    questions,
    totalPoints,
    createdByName: user?.full_name || user?.name || 'Instructor'
  };

  return (
    <div className='lg:sticky lg:top-4 space-y-3'>
      {mode === 'offline' ? (
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={() => printQuizPreview(previewData)}
          >
            <Printer className='w-3.5 h-3.5' /> Print
          </Button>
          <Button
            size='sm'
            className='gap-1.5'
            onClick={() => downloadQuizPreview(previewData)}
          >
            <Download className='w-3.5 h-3.5' /> Download
          </Button>
        </div>
      ) : null}

      <div className='border rounded-xl bg-card shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between border-b px-5 py-3'>
          <span className='font-bold text-primary'>Campus Connect</span>
          <span className='font-bold text-lg'>Quiz</span>
        </div>

        <div className='p-5 space-y-4 max-h-[min(70vh,700px)] overflow-y-auto'>
          <div>
            <div className='flex items-center gap-2 flex-wrap'>
              <h3 className='font-bold text-lg truncate'>{title || 'New Quiz'}</h3>
              <Badge variant='secondary' size='xs' className='rounded-full'>
                {is_draft ? 'Draft' : 'Published'}
              </Badge>
              <Badge variant='outline' size='xs' className='rounded-full capitalize'>
                {mode}
              </Badge>
            </div>
            {description ? (
              <p className='text-xs text-muted-foreground mt-1'>{description}</p>
            ) : null}
          </div>

          <div className='grid grid-cols-2 gap-4 text-xs'>
            <div>
              <p className='uppercase tracking-wide text-muted-foreground font-medium mb-1'>
                Created By
              </p>
              <p>{previewData.createdByName}</p>
              <p className='text-muted-foreground'>Campus Connect LMS</p>
            </div>
            <div>
              <p className='uppercase tracking-wide text-muted-foreground font-medium mb-1'>
                Quiz Details
              </p>
              <p>Duration: {duration_minutes} min</p>
              <p>Pass Score: {passing_score}%</p>
            </div>
          </div>

          <div className='border-t pt-4 space-y-3'>
            {questions.length === 0 ? (
              <p className='text-sm text-muted-foreground italic text-center py-4'>
                No questions added yet
              </p>
            ) : (
              questions.map((q, i) => (
                <div key={i} className='text-sm'>
                  <div className='flex items-baseline gap-2'>
                    <span className='font-semibold'>{i + 1}.</span>
                    <span className='font-medium flex-1 truncate'>
                      {q.question_text || 'Untitled question'}
                    </span>
                    <span className='text-xs text-muted-foreground shrink-0'>{q.points} pt</span>
                  </div>
                  <p className='text-[11px] text-muted-foreground ml-5'>{TYPE_LABEL[q.question_type]}</p>
                  {q.question_type !== 'SHORT_ANSWER' ? (
                    <ul className='ml-5 mt-1 space-y-0.5'>
                      {q.options.map((o, oi) => (
                        <li
                          key={oi}
                          className={`text-xs flex items-center gap-1 ${
                            o.is_correct ? 'text-success font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          {o.is_correct ? <Check className='w-3 h-3' /> : null}
                          {o.option_text || '—'}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className='border rounded-lg p-3 text-sm space-y-1 max-w-[220px] ml-auto'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Questions</span>
              <span className='font-medium tabular-nums'>{questions.length}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Duration</span>
              <span className='font-medium tabular-nums'>{duration_minutes} min</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Pass Score</span>
              <span className='font-medium tabular-nums'>{passing_score}%</span>
            </div>
            <div className='flex justify-between border-t pt-1 font-bold'>
              <span>Total Points</span>
              <span className='tabular-nums'>{totalPoints}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
