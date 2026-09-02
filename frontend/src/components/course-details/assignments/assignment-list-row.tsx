'use client';

import { format } from 'date-fns';
import { Paperclip } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { serverNowDate } from '@/lib/server-clock';
import { assignmentMarksLabel } from './assignments-table-utils';
import { AssignmentRowActions } from './assignment-row-actions';

interface AssignmentListRowProps {
  assignment: Assignment;
  col: (id: string) => boolean;
  courseMaxMarks?: number;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenSubmissions: (a: Assignment) => void;
  onTogglePublish: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;
  onDelete: (id: number) => void;
}

export function AssignmentListRow({
  assignment: a,
  col,
  courseMaxMarks,
  isSelected,
  onToggleSelect,
  onOpenSubmissions,
  onTogglePublish,
  onEdit,
  onDelete
}: AssignmentListRowProps) {
  const attCount = a.attachments?.length ?? 0;
  const dueAt = new Date(a.due_date);
  const isOverdue = !a.is_draft && dueAt < serverNowDate();
  const submissionCount = a._count?.submissions ?? a.submissions?.length ?? 0;
  const pendingCount = a.pendingGradingCount ?? 0;
  const workLabel = a.workMode === 'GROUP' ? 'Group' : 'Individual';
  const gradingLabel = a.gradingScope === 'GROUP' ? 'Group grade' : 'Per student';

  return (
    <PosTableRow
      className={cn(
        'group',
        isSelected && 'bg-primary/[0.04]',
        a.is_draft && 'bg-muted'
      )}
    >
      <PosTableCell className='w-10'>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(a.id)}
          aria-label={isSelected ? `Deselect ${a.title}` : `Select ${a.title}`}
          className='size-[18px] border-2 border-[#94A3B8] bg-card data-[state=checked]:border-primary'
        />
      </PosTableCell>
      {col('title') ? (
        <PosTableCell className='min-w-[220px] max-w-[360px] whitespace-normal'>
          <div className='space-y-0.5'>
            <div className='flex min-w-0 items-center gap-2'>
              <span className='truncate text-sm font-medium'>{a.title}</span>
              {attCount > 0 ? (
                <span
                  className='inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-xs text-muted-foreground'
                  title={`${attCount} attachment${attCount === 1 ? '' : 's'}`}
                >
                  <Paperclip className='size-3' />
                  {attCount}
                </span>
              ) : null}
            </div>
            {a.description ? (
              <p className='line-clamp-1 text-xs text-muted-foreground'>{a.description}</p>
            ) : null}
          </div>
        </PosTableCell>
      ) : null}
      {col('marks') ? (
        <PosTableCell>
          <span className='text-sm font-medium tabular-nums text-foreground'>
            {assignmentMarksLabel(a, courseMaxMarks)}
          </span>
        </PosTableCell>
      ) : null}
      {col('work') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{workLabel}</span>
        </PosTableCell>
      ) : null}
      {col('grading') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{gradingLabel}</span>
        </PosTableCell>
      ) : null}
      {col('opens') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>
            {a.open_at ? format(new Date(a.open_at), 'MMM d, h:mm a') : '—'}
          </span>
        </PosTableCell>
      ) : null}
      {col('due') ? (
        <PosTableCell>
          <div className='flex flex-col gap-0.5'>
            <span className={cn('text-sm', isOverdue ? 'font-medium text-destructive' : '')}>
              {format(dueAt, 'MMM d, h:mm a')}
            </span>
            {isOverdue ? (
              <span className='text-[10px] font-semibold uppercase tracking-wide text-destructive'>
                Overdue
              </span>
            ) : null}
          </div>
        </PosTableCell>
      ) : null}
      {col('submissions') ? (
        <PosTableCell align='right'>
          <div className='inline-flex flex-col items-end gap-0.5'>
            <span className='text-sm font-medium tabular-nums'>{submissionCount}</span>
            {pendingCount > 0 ? (
              <span className='rounded-full bg-warning-muted px-2 py-0.5 text-[10px] font-medium text-warning-foreground'>
                {pendingCount} to grade
              </span>
            ) : null}
          </div>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <AssignmentRowActions
          assignment={a}
          onOpenSubmissions={onOpenSubmissions}
          onTogglePublish={onTogglePublish}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </PosTableCell>
    </PosTableRow>
  );
}
