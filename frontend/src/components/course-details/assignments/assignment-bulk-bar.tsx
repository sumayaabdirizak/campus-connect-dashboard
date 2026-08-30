'use client';

import { Check, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Assignment } from '@/lib/course-details/services/assignments-types';

interface AssignmentBulkBarProps {
  selectedIds: Set<number>;
  filtered: Assignment[];
  onClear: () => void;
  onSelectAll: (ids: Set<number>) => void;
  onPublish: (asDraft: boolean) => void;
  onDelete: () => void;
}

export function AssignmentBulkBar({
  selectedIds,
  filtered,
  onClear,
  onSelectAll,
  onPublish,
  onDelete
}: AssignmentBulkBarProps) {
  if (selectedIds.size === 0) return null;
  const allSelected = selectedIds.size === filtered.length;

  return (
    <div className='sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
      <div className='flex items-center justify-between gap-3 flex-wrap rounded-xl border bg-card p-3'>
        <div className='flex items-center gap-3 min-w-0'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              if (allSelected) onClear();
              else onSelectAll(new Set(filtered.map((a) => a.id)));
            }}
            className='gap-1'
          >
            {allSelected ? (
              <CheckSquare className='w-4 h-4' />
            ) : (
              <Square className='w-4 h-4' />
            )}
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
          <p className='text-sm tabular-nums'>{selectedIds.size} selected</p>
        </div>
        <div className='flex gap-2 flex-wrap'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPublish(false)}
            className='gap-1'
          >
            <Check className='w-3.5 h-3.5' /> Publish
          </Button>
          <Button variant='outline' size='sm' onClick={() => onPublish(true)}>
            Unpublish
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onDelete}
            className='gap-1 text-destructive hover:text-destructive'
          >
            <Trash2 className='w-3.5 h-3.5' /> Delete
          </Button>
          <Button variant='ghost' size='sm' onClick={onClear}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
