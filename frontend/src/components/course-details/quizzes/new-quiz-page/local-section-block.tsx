'use client';

import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Trash2 } from 'lucide-react';
import { DraftQuestionEditor } from '../quiz-builder/draft-question-editor';
import type { DraftQuestion, QuizQuestionType } from '../quiz-builder/types';

const TYPE_META: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};

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
  /** Rendered inline when this section owns the currently open draft editor */
  inlineDraft?: Omit<ComponentProps<typeof DraftQuestionEditor>, 'lockType' | 'maxPoints'> | null;
}

/// Same "one section per marks-plan type" pattern as the real builder's
/// `QuizSectionBlock` — mirrored here because before the quiz exists yet,
/// staged questions are plain local state (no real ids), not `QuizQuestion`
/// rows from the API.
export function LocalSectionBlock({
  type,
  targetMarks,
  entries,
  draftOpen,
  editingIndex,
  onAdd,
  onEdit,
  onDelete,
  inlineDraft = null
}: LocalSectionBlockProps) {
  const used = entries.reduce((sum, e) => sum + (Number(e.draft.points) || 0), 0);
  const complete = targetMarks > 0 && used === targetMarks;
  const targetReached = targetMarks > 0 && used >= targetMarks;
  const editingPoints =
    editingIndex != null ? entries.find((e) => e.index === editingIndex)?.draft.points ?? 0 : 0;

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
            {entries.length} question{entries.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className='space-y-2'>
        {entries.length === 0 && !draftOpen ? (
          <div className='border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground'>
            No {TYPE_META[type].toLowerCase()} questions yet.
          </div>
        ) : null}
        {entries.map(({ index, draft: q }, i) => (
          <div key={index} className='border rounded-lg p-3 bg-background'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <p className='font-medium text-sm'>
                  {i + 1}. {q.question_text || <span className='text-muted-foreground italic'>Untitled question</span>}
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
        ))}
      </div>

      {inlineDraft ? (
        <DraftQuestionEditor
          {...inlineDraft}
          lockType={true}
          maxPoints={targetMarks > 0 ? targetMarks - used + editingPoints : undefined}
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
          disabled={draftOpen}
        >
          <Plus className='w-3.5 h-3.5' /> Add Question
        </Button>
      )}
    </div>
  );
}
