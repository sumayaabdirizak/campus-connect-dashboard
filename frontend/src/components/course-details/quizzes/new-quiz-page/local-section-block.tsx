'use client';

import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Trash2 } from 'lucide-react';
import { DraftQuestionEditor } from '../quiz-builder/draft-question-editor';
import type { QuizDeliveryMode } from '../quiz-question-types';
import type { DraftQuestion, QuizQuestionType } from '../quiz-builder/types';
import { quizFormOutlineBtnClass } from './field-styles';

const TYPE_META: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};

type InlineDraftProps = Omit<
  ComponentProps<typeof DraftQuestionEditor>,
  'lockType' | 'maxPoints' | 'quizMode'
>;

interface LocalSectionBlockProps {
  type: QuizQuestionType;
  targetMarks: number;
  /** (index into the full staged-questions array, question) pairs for this type */
  entries: Array<{ index: number; draft: DraftQuestion }>;
  draftOpen: boolean;
  editingIndex: number | null;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  /** Open draft for this section (add or edit). */
  inlineDraft?: InlineDraftProps | null;
  quizMode?: QuizDeliveryMode;
  /** Hide the per-section Add Question button (create flow uses AI only). */
  showAddButton?: boolean;
}

export function LocalSectionBlock({
  type,
  targetMarks,
  entries,
  draftOpen,
  editingIndex,
  onAdd,
  onEdit,
  onDelete,
  inlineDraft = null,
  quizMode = 'online',
  showAddButton = true
}: LocalSectionBlockProps) {
  const used = entries.reduce((sum, e) => sum + (Number(e.draft.points) || 0), 0);
  const complete = targetMarks > 0 && used === targetMarks;
  const over = targetMarks > 0 && used > targetMarks;
  const targetReached = targetMarks > 0 && used >= targetMarks;
  const editingPoints =
    editingIndex != null ? entries.find((e) => e.index === editingIndex)?.draft.points ?? 0 : 0;
  const maxPoints = targetMarks > 0 ? targetMarks - used + editingPoints : undefined;
  const isAdding = inlineDraft != null && editingIndex == null;

  return (
    <div className='border rounded-xl p-4 space-y-3'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div>
          <h3 className='text-base font-semibold'>
            Section: {TYPE_META[type]}
            {targetMarks > 0 && (
              <span className='text-foreground font-normal'> ({targetMarks} marks)</span>
            )}
          </h3>
          <p
            className={`mt-0.5 text-sm tabular-nums ${
              over
                ? 'text-destructive font-medium'
                : complete
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-foreground'
            }`}
          >
            {used}
            {targetMarks > 0 ? `/${targetMarks}` : ''} marks used{complete ? ' ✓' : ''}
            {over ? ` — over by ${used - targetMarks}` : ''} · {entries.length} question
            {entries.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className='space-y-2'>
        {entries.length === 0 && !draftOpen ? (
          <div className='rounded-lg border border-dashed p-4 text-center text-sm text-foreground'>
            No {TYPE_META[type].toLowerCase()} questions yet.
          </div>
        ) : null}
        {entries.map(({ index, draft: q }, i) => {
          // Edit in place — replace this row with the editor, don't open another below.
          if (inlineDraft && editingIndex === index) {
            return (
              <DraftQuestionEditor
                key={index}
                {...inlineDraft}
                lockType
                maxPoints={maxPoints}
                quizMode={quizMode}
              />
            );
          }

          return (
            <div key={index} className='border rounded-lg p-3 bg-background'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='text-base font-medium'>
                    {i + 1}.{' '}
                    {q.question_text || (
                      <span className='text-foreground italic'>Untitled question</span>
                    )}
                  </p>
                  <div className='flex gap-2 mt-1 flex-wrap'>
                    <Badge variant='outline' className='text-[10px]'>
                      {q.points} pt
                    </Badge>
                    {q.explanation ? (
                      <span
                        className='text-[10px] text-muted-foreground self-center'
                        title={q.explanation}
                      >
                        has explanation
                      </span>
                    ) : null}
                  </div>
                  {q.question_type !== 'SHORT_ANSWER' && q.options.length > 0 ? (
                    <ul className='mt-2 space-y-1'>
                      {q.options.map((o, oi) => (
                        <li
                          key={oi}
                          className={`flex items-center gap-2 text-sm ${
                            o.is_correct ? 'text-success font-medium' : 'text-foreground'
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
                    onClick={() => onEdit(index)}
                    disabled={draftOpen}
                  >
                    Edit
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='text-destructive'
                    onClick={() => onDelete(index)}
                    disabled={draftOpen}
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAdding ? (
        <DraftQuestionEditor
          {...inlineDraft!}
          lockType
          maxPoints={maxPoints}
          quizMode={quizMode}
        />
      ) : null}

      {targetReached ? (
        <p className={`text-sm ${over ? 'text-destructive' : 'text-foreground'}`}>
          {over
            ? `This section is ${used - targetMarks} mark${used - targetMarks === 1 ? '' : 's'} over its ${targetMarks}-mark target — remove or edit a question to bring it back down.`
            : 'Target marks reached — remove or edit a question here to add another.'}
        </p>
      ) : showAddButton ? (
        <Button
          variant='outline'
          size='sm'
          className={`${quizFormOutlineBtnClass} h-9 gap-1.5 px-4 text-sm`}
          onClick={onAdd}
          disabled={draftOpen}
        >
          <Plus className='size-4' /> Add Question
        </Button>
      ) : null}
    </div>
  );
}
