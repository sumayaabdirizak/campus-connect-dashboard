'use client';

import { Check, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TeacherQuizBulkBar({
  selectedCount,
  totalCount,
  onToggleSelectAll,
  onPublish,
  onUnpublish,
  onDelete,
  onCancel,
}: {
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div className='sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
      <div className='border rounded-xl p-2.5 bg-card flex items-center justify-between gap-3 flex-wrap'>
        <div className='flex items-center gap-3 min-w-0'>
          <Button variant='ghost' size='sm' onClick={onToggleSelectAll} className='gap-1'>
            {allSelected ? (
              <CheckSquare className='w-4 h-4' />
            ) : (
              <Square className='w-4 h-4' />
            )}
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
          <p className='text-sm tabular-nums'>{selectedCount} selected</p>
        </div>
        <div className='flex gap-2 flex-wrap'>
          <Button variant='outline' size='sm' onClick={onPublish} className='gap-1'>
            <Check className='w-3.5 h-3.5' /> Publish
          </Button>
          <Button variant='outline' size='sm' onClick={onUnpublish}>
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
          <Button variant='ghost' size='sm' onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
