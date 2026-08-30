'use client';

import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';

/// Row-level actions for the quiz table. Questions and Attempts stay as
/// direct buttons — they're the two things a teacher opens constantly — and
/// everything rarer lives in the overflow menu, matching the assignments row.
export function QuizRowActions({
  quiz: q,
  isEmpty,
  onEditQuiz,
  onViewAttempts,
  onDelete,
  onTogglePublish,
  onDuplicate,
  onPreview
}: {
  quiz: Quiz;
  isEmpty: boolean;
  onEditQuiz: () => void;
  onViewAttempts: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
}) {
  const pending = q.pendingGradingCount ?? 0;

  return (
    <div className='inline-flex items-center justify-end gap-0.5'>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-8'
        onClick={onEditQuiz}
        aria-label={`Edit ${q.title}`}
        title='Edit quiz'
      >
        <Pencil className='size-4' />
      </Button>

      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='relative size-8'
        onClick={onViewAttempts}
        aria-label={
          pending > 0
            ? `View attempts on ${q.title} — ${pending} need grading`
            : `View attempts on ${q.title}`
        }
        title='View attempts'
      >
        <Eye className='size-4' />
        {pending > 0 ? (
          <span
            className='absolute -right-0.5 -top-0.5 inline-flex size-2 rounded-full bg-destructive'
            title={`${pending} attempt${pending === 1 ? '' : 's'} need grading`}
          />
        ) : null}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label={`More actions for ${q.title}`}
          >
            <MoreHorizontal className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuLabel className='text-xs text-muted-foreground'>
            Manage quiz
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={onTogglePublish}>
            {q.is_draft ? 'Publish' : 'Unpublish'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPreview} disabled={isEmpty} className='gap-2'>
            <Eye className='size-4' /> Preview as student
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate} className='gap-2'>
            <Copy className='size-4' /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className='gap-2 text-destructive focus:text-destructive'
          >
            <Trash2 className='size-4' /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
