'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Trash2 } from 'lucide-react';
import type { QuizQuestion, QuizQuestionType } from './types';
import { DraftQuestionEditor } from './draft-question-editor';
import type { ComponentProps } from 'react';

const TYPE_META: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};

interface QuizSectionBlockProps {
  type: QuizQuestionType;
  targetMarks: number;
  questions: QuizQuestion[];
  canAddQuestions: boolean;
  addLockedTitle: string;
  draftOpen: boolean;
  deletePending: boolean;
  onAdd: () => void;
  onEdit: (q: QuizQuestion) => void;
  onDelete: (q: QuizQuestion) => void;
  /** When set, renders the DraftQuestionEditor inline below the questions list */
  inlineDraft?: Omit<ComponentProps<typeof DraftQuestionEditor>, 'lockType'> | null;
}

/// A section grouped by question type, driven by the marks plan. Questions
/// here aren't drag-reorderable across sections — each section's block only
/// shows a filtered slice of the quiz's questions, and the shared reorder
/// handler computes order_index from array position, so dragging within a
/// filtered slice would silently collide with other sections' order_index
/// values. The flat "Other questions" list (outside any section) keeps full
/// drag-and-drop, same as the plan-free builder.
export function QuizSectionBlock({
  type,
  targetMarks,
  questions,
  canAddQuestions,
  addLockedTitle,
  draftOpen,
  deletePending,
  onAdd,
  onEdit,
  onDelete,
  inlineDraft = null,
}: QuizSectionBlockProps) {
  const used = questions.reduce((sum, q) => sum + q.points, 0);
  const complete = targetMarks > 0 && used === targetMarks;
  const targetReached = targetMarks > 0 && used >= targetMarks;

  return (
    <div className='border rounded-xl p-4 space-y-3'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div>
          <h3 className='font-semibold text-sm'>
            Section: {TYPE_META[type]}
            {targetMarks > 0 && (
              <span className='text-muted-foreground font-normal'> ({targetMarks} marks)</span>
            )}
          </h3>
          <p
            className={`text-xs tabular-nums mt-0.5 ${
              complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            }`}
          >
            {used}
            {targetMarks > 0 ? `/${targetMarks}` : ''} marks used{complete ? ' ✓' : ''} ·{' '}
            {questions.length} question{questions.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className='space-y-2'>
        {questions.length === 0 && !draftOpen ? (
          <div className='border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground'>
            No {TYPE_META[type].toLowerCase()} questions yet.
          </div>
        ) : null}
        {questions.map((q, i) => (
          <div key={q.id} className='border rounded-lg p-3 bg-background'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <p className='font-medium text-sm'>
                  {i + 1}. {q.question_text}
                </p>
                <div className='flex gap-2 mt-1 flex-wrap'>
                  <Badge variant='outline' className='text-[10px]'>
                    {q.points} pt
                  </Badge>
                  {q.explanation ? (
                    <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                      Explanation
                    </Badge>
                  ) : null}
                </div>
                {q.question_type !== 'SHORT_ANSWER' && q.options.length > 0 ? (
                  <ul className='mt-2 space-y-1'>
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={`text-xs flex items-center gap-2 ${
                          o.is_correct ? 'text-success font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {o.is_correct ? <Check className='w-3 h-3' /> : null}
                        <span>{o.option_text}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className='flex gap-1 shrink-0'>
                <Button variant='outline' size='sm' onClick={() => onEdit(q)} disabled={draftOpen}>
                  Edit
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-destructive'
                  onClick={() => onDelete(q)}
                  disabled={deletePending || draftOpen}
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline draft editor — rendered right here when this section owns the draft */}
      {inlineDraft ? (
        <DraftQuestionEditor
          {...inlineDraft}
          lockType={true}
          maxPoints={
            targetMarks > 0
              ? targetMarks -
                used +
                (questions.find((q) => q.id === inlineDraft.draft.id)?.points ?? 0)
              : undefined
          }
        />
      ) : null}

      {targetReached ? (
        <p className='text-xs text-muted-foreground'>
          Target marks reached — remove or edit a question here to add another.
        </p>
      ) : (
        <Button
          variant='outline'
          size='sm'
          className='gap-1'
          onClick={onAdd}
          disabled={draftOpen || !canAddQuestions}
          title={canAddQuestions ? undefined : addLockedTitle}
        >
          <Plus className='w-3.5 h-3.5' /> Add Question
        </Button>
      )}
    </div>
  );
}
