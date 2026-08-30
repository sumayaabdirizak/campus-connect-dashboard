'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { Assignment } from '@/lib/course-details/services/assignments-types';

interface AssignmentRowActionsProps {
  assignment: Assignment;
  onOpenSubmissions: (a: Assignment) => void;
  onTogglePublish: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;
  onDelete: (id: number) => void;
}

export function AssignmentRowActions({
  assignment: a,
  onOpenSubmissions,
  onTogglePublish,
  onEdit,
  onDelete
}: AssignmentRowActionsProps) {
  const pendingCount = a.pendingGradingCount ?? 0;

  return (
    <div className='inline-flex items-center justify-end gap-0.5'>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='relative size-8'
        onClick={() => onOpenSubmissions(a)}
        aria-label={
          pendingCount > 0
            ? `View submissions for ${a.title} — ${pendingCount} need grading`
            : `View submissions for ${a.title}`
        }
        title='View submissions'
      >
        <Icons.eye className='size-4' />
        {pendingCount > 0 ? (
          <span
            className='absolute -right-0.5 -top-0.5 inline-flex size-2 rounded-full bg-destructive'
            title={`${pendingCount} submission${pendingCount === 1 ? '' : 's'} need grading`}
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
            aria-label={`More actions for ${a.title}`}
          >
            <Icons.ellipsis className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-40'>
          <DropdownMenuItem onClick={() => onTogglePublish(a)}>
            {a.is_draft ? 'Publish' : 'Unpublish'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(a)}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(a.id)}
            className='text-destructive focus:text-destructive'
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
