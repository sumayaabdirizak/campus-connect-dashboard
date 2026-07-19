'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, GripVertical, Trash2 } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { QuizQuestion } from '../../api/quizzes-types';

interface SortableQuestionRowProps {
  question: QuizQuestion;
  index: number;
  disableActions: boolean;
  deletePending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableQuestionRow({
  question: q,
  index: i,
  disableActions,
  deletePending,
  onEdit,
  onDelete
}: SortableQuestionRowProps) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } =
    useSortable({ id: q.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.9 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-background ${
        isDragging ? 'shadow-lg ring-1 ring-primary/30' : ''
      }`}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-start gap-2 min-w-0'>
          <button
            type='button'
            className='cursor-grab active:cursor-grabbing text-muted-foreground/70 hover:text-muted-foreground p-1 -ml-1 mt-0.5'
            aria-label={`Drag to reorder question ${i + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className='w-4 h-4' />
          </button>
          <div className='min-w-0'>
            <p className='font-medium'>
              {i + 1}. {q.question_text}
            </p>
            <div className='flex gap-2 mt-1 flex-wrap'>
              <Badge variant='outline' className='text-[10px]'>
                {q.question_type.replace('_', ' ')}
              </Badge>
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
                      o.is_correct
                        ? 'text-success font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {o.is_correct ? <Check className='w-3 h-3' /> : null}
                    <span>{o.option_text}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className='flex gap-1 shrink-0'>
          <Button variant='outline' size='sm' onClick={onEdit} disabled={disableActions}>
            Edit
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-destructive'
            onClick={onDelete}
            disabled={deletePending || disableActions}
          >
            <Trash2 className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
