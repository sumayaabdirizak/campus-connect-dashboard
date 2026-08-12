'use client';

import {
  CalendarPlus,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { assignmentIcsUrl } from '@/lib/course-details/services/assignments-service';
import type { Assignment } from '@/lib/course-details/services/assignments-types';

interface AssignmentRowActionsProps {
  assignment: Assignment;
  onOpenSubmissions: (a: Assignment) => void;
  onTogglePublish: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void;
  onDelete: (id: number) => void;
}

export function AssignmentRowActions({
  assignment: a,
  onOpenSubmissions,
  onTogglePublish,
  onEdit,
  onDuplicate,
  onDelete
}: AssignmentRowActionsProps) {
  const pendingCount = a.pendingGradingCount ?? 0;
  return (
    <div className='flex gap-1 justify-end'>
      <Button
        variant='outline'
        size='sm'
        onClick={() => onOpenSubmissions(a)}
        aria-label={
          pendingCount > 0
            ? `View ${a.title} — ${pendingCount} need grading`
            : `View ${a.title}`
        }
        className='relative h-7 px-2 text-xs shadow-sm'
      >
        <Eye className='w-3.5 h-3.5 mr-1' /> View
        {pendingCount > 0 ? (
          <span
            className='absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-semibold tabular-nums bg-destructive text-destructive-foreground shadow-sm'
            title={`${pendingCount} submission${pendingCount === 1 ? '' : 's'} need grading`}
          >
            {pendingCount}
          </span>
        ) : null}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            aria-label={`More actions for ${a.title}`}
          >
            <MoreHorizontal className='w-3.5 h-3.5' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44'>
          <DropdownMenuLabel className='text-xs text-muted-foreground'>
            Manage
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onTogglePublish(a)} className='gap-2'>
            {a.is_draft ? (
              <>
                <Eye className='w-4 h-4' /> Publish
              </>
            ) : (
              <>
                <EyeOff className='w-4 h-4' /> Unpublish
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(a)} className='gap-2'>
            <Pencil className='w-4 h-4' /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(a)} className='gap-2'>
            <Copy className='w-4 h-4' /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem asChild className='gap-2'>
            <a href={assignmentIcsUrl(a.id)}>
              <CalendarPlus className='w-4 h-4' /> Calendar (.ics)
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(a.id)}
            className='gap-2 text-destructive focus:text-destructive'
          >
            <Trash2 className='w-4 h-4' /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
