'use client';

import { Check, HelpCircle, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DraftQuestion, QuizQuestionType } from '../quiz-builder/types';

const TYPE_META: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};

export function LocalQuestionList({
  questions,
  draftOpen,
  onEdit,
  onDelete
}: {
  questions: DraftQuestion[];
  draftOpen: boolean;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  if (questions.length === 0 && !draftOpen) {
    return (
      <div className='border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2'>
        <HelpCircle className='w-5 h-5' />
        No questions yet — set up a marks plan on the Advanced tab to add some, or
        create the quiz now and add questions later.
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {questions.map((q, i) => (
        <div key={i} className='border rounded-lg p-3 bg-background'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <p className='font-medium text-sm'>
                {i + 1}. {q.question_text || <span className='text-muted-foreground italic'>Untitled question</span>}
              </p>
              <div className='flex gap-2 mt-1 flex-wrap'>
                <Badge variant='outline' className='text-[10px] rounded-full'>
                  {TYPE_META[q.question_type]}
                </Badge>
                <Badge variant='outline' className='text-[10px] rounded-full'>
                  {q.points} pt
                </Badge>
              </div>
              {q.question_type !== 'SHORT_ANSWER' && q.options.length > 0 ? (
                <ul className='mt-2 space-y-1'>
                  {q.options.map((o, oi) => (
                    <li
                      key={oi}
                      className={`text-xs flex items-center gap-2 ${
                        o.is_correct ? 'text-success font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {o.is_correct ? <Check className='w-3 h-3' /> : null}
                      <span>{o.option_text || '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className='flex gap-1 shrink-0'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onEdit(i)}
                disabled={draftOpen}
              >
                <Pencil className='w-3.5 h-3.5' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='text-destructive'
                onClick={() => onDelete(i)}
                disabled={draftOpen}
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
