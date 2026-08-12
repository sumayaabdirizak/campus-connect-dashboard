'use client';

import { format } from 'date-fns';
import { CheckSquare, Paperclip, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { AssignmentRowActions } from './assignment-row-actions';

interface AssignmentListRowProps {
  assignment: Assignment;
  isSelected: boolean;
  anySelected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenSubmissions: (a: Assignment) => void;
  onTogglePublish: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void;
  onDelete: (id: number) => void;
}

export function AssignmentListRow({
  assignment: a,
  isSelected,
  anySelected,
  onToggleSelect,
  onOpenSubmissions,
  onTogglePublish,
  onEdit,
  onDuplicate,
  onDelete
}: AssignmentListRowProps) {
  const attCount = a.attachments?.length ?? 0;
  const dueAt = new Date(a.due_date);
  const isOverdue = !a.is_draft && dueAt < new Date();
  const submissionCount = a._count?.submissions ?? a.submissions?.length ?? 0;
  const pendingCount = a.pendingGradingCount ?? 0;
  const workLabel = a.workMode === 'GROUP' ? 'Group' : 'Individual';
  const gradingLabel = a.gradingScope === 'GROUP' ? 'Group grade' : 'Per student';

  return (
    <TableRow
      className={`group transition-colors hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2.5 ${
        isSelected ? 'bg-primary/[0.04]' : ''
      } ${a.is_draft ? 'bg-muted/15' : ''}`}
    >
      <TableCell>
        <button
          type='button'
          onClick={() => onToggleSelect(a.id)}
          aria-label={isSelected ? `Deselect ${a.title}` : `Select ${a.title}`}
          aria-pressed={isSelected}
          className={`p-1 -m-1 rounded transition-opacity ${
            isSelected || anySelected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 focus:opacity-100'
          }`}
        >
          {isSelected ? (
            <CheckSquare className='w-4 h-4 text-primary' />
          ) : (
            <Square className='w-4 h-4 text-muted-foreground' />
          )}
        </button>
      </TableCell>
      <TableCell className='align-top'>
        <div className='min-w-0 space-y-1'>
          <div className='flex min-w-0 items-center gap-2'>
            <span className='truncate font-medium'>{a.title}</span>
            {attCount > 0 ? (
              <span
                className='inline-flex shrink-0 items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground'
                title={`${attCount} attachment${attCount === 1 ? '' : 's'}`}
              >
                <Paperclip className='w-3 h-3' />
                {attCount}
              </span>
            ) : null}
          </div>
          {a.description ? (
            <p className='line-clamp-1 text-xs font-normal text-muted-foreground'>
              {a.description}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className='align-top'>
        <Badge variant='outline' className='px-2 py-0.5 text-[10px] font-medium'>
          {workLabel}
        </Badge>
      </TableCell>
      <TableCell className='align-top'>
        <Badge variant='outline' className='px-2 py-0.5 text-[10px] font-medium'>
          {gradingLabel}
        </Badge>
      </TableCell>
      <TableCell className='align-top whitespace-nowrap text-xs text-muted-foreground'>
        {a.open_at ? format(new Date(a.open_at), 'MMM d, h:mm a') : '—'}
      </TableCell>
      <TableCell
        className={`align-top whitespace-nowrap text-xs ${
          isOverdue ? 'font-medium text-rose-600 dark:text-rose-400' : ''
        }`}
      >
        <div className='flex flex-col gap-0.5'>
          <span>{format(dueAt, 'MMM d, h:mm a')}</span>
          {isOverdue ? (
            <span className='text-[10px] uppercase tracking-wide'>Overdue</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className='align-top text-right'>
        <div className='inline-flex flex-col items-end gap-0.5'>
          <span className='text-sm font-semibold tabular-nums text-foreground'>
            {submissionCount}
          </span>
          {pendingCount > 0 ? (
            <span className='rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300'>
              {pendingCount} to grade
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant='outline'
          className={`px-1.5 py-0 text-[10px] font-medium ${
            a.is_draft
              ? 'border-muted-foreground/20 text-muted-foreground'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          }`}
          title={
            a.is_draft
              ? 'Draft — students cannot see this assignment'
              : 'Published — visible to students'
          }
        >
          {a.is_draft ? 'Draft' : 'Live'}
        </Badge>
      </TableCell>
      <TableCell className='align-top'>
        <AssignmentRowActions
          assignment={a}
          onOpenSubmissions={onOpenSubmissions}
          onTogglePublish={onTogglePublish}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
