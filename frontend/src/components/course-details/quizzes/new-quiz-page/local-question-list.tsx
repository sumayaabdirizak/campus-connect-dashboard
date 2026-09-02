'use client';

import type { ComponentProps } from 'react';
import { Check, GripVertical, ListPlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraftQuestionEditor } from '../quiz-builder/draft-question-editor';
import type { QuizDeliveryMode } from '../quiz-question-types';
import type { DraftQuestion, QuizQuestionType } from '../quiz-builder/types';
import { quizFormHintClass, quizFormIconBtnClass, quizFormRowClass } from './field-styles';

const TYPE_META: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};

type InlineDraftProps = Omit<
  ComponentProps<typeof DraftQuestionEditor>,
  'lockType' | 'maxPoints' | 'quizMode'
>;

export function LocalQuestionList({
  entries,
  draftOpen,
  editingIndex,
  onEdit,
  onDelete,
  inlineDraft = null,
  mode = 'create',
  quizMode = 'online'
}: {
  /** Real indices into the full staged-questions array. */
  entries: Array<{ index: number; draft: DraftQuestion }>;
  draftOpen: boolean;
  editingIndex: number | null;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  /** When editing one of these rows, render the editor in place. */
  inlineDraft?: InlineDraftProps | null;
  mode?: 'create' | 'edit';
  quizMode?: QuizDeliveryMode;
}) {
  if (entries.length === 0 && !draftOpen) {
    return (
      <div className='flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-muted p-8 text-center text-foreground'>
        <ListPlus className='size-5 text-muted-foreground' />
        <p className='text-sm font-medium text-foreground'>No questions yet</p>
        <p className={`max-w-md ${quizFormHintClass}`}>
          {mode === 'edit' ? (
            <>
              Add questions using <strong className='text-foreground'>Add Question</strong> inside each
              section below.
            </>
          ) : (
            <>
              Add questions using <strong className='text-foreground'>Add Question</strong> inside each
              section below, or use <strong className='text-foreground'>Create with AI</strong>.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {entries.map(({ index, draft: q }, i) => {
        if (inlineDraft && editingIndex === index) {
          return (
            <DraftQuestionEditor
              key={index}
              {...inlineDraft}
              lockType={false}
              quizMode={quizMode}
            />
          );
        }

        return (
          <div key={index} className={`flex items-start gap-3 ${quizFormRowClass}`}>
            <div className='flex shrink-0 items-center gap-1 pt-0.5'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 rounded-full text-destructive hover:bg-red-50 hover:text-destructive'
                onClick={() => onDelete(index)}
                disabled={draftOpen}
                aria-label='Delete question'
              >
                <Trash2 className='size-4' />
              </Button>
              <GripVertical className='size-4 text-gray-300' aria-hidden />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-medium'>
                {i + 1}.{' '}
                {q.question_text || (
                  <span className='italic text-muted-foreground'>Untitled question</span>
                )}
              </p>
              <p className={`mt-1 ${quizFormHintClass}`}>
                {TYPE_META[q.question_type]} · {q.points} pt
              </p>
              {q.question_type !== 'SHORT_ANSWER' && q.options.length > 0 ? (
                <ul className='mt-2 space-y-1'>
                  {q.options.map((o, oi) => (
                    <li
                      key={oi}
                      className={`flex items-center gap-2 text-sm ${
                        o.is_correct ? 'font-medium text-emerald-600' : 'text-muted-foreground'
                      }`}
                    >
                      {o.is_correct ? <Check className='size-3' /> : null}
                      <span>{o.option_text || '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button
              variant='outline'
              size='icon'
              className={quizFormIconBtnClass}
              onClick={() => onEdit(index)}
              disabled={draftOpen}
              aria-label='Edit question'
            >
              <Pencil className='size-3.5' />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
