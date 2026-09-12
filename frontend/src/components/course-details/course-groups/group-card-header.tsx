'use client';

import { Button } from '@/features/ui/components/button';
import { Pencil, Trash2 } from 'lucide-react';
import { GroupRenameForm } from './group-rename-form';

export function GroupCardHeader({
  name,
  isStudent,
  renaming,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
  onStartRename,
  onDelete
}: {
  name: string;
  isStudent: boolean;
  renaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className='flex items-start justify-between gap-2'>
      {renaming ? (
        <GroupRenameForm
          value={renameValue}
          onChange={onRenameValueChange}
          onSubmit={onRenameSubmit}
          onCancel={onRenameCancel}
        />
      ) : (
        <h3 className='min-w-0 truncate text-lg tracking-tight text-foreground font-display'>
          {name}
        </h3>
      )}
      {!isStudent && !renaming ? (
        <div
          className='flex shrink-0 items-center gap-1'
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1 border-border px-2.5 text-xs font-medium'
            onClick={onStartRename}
          >
            <Pencil className='size-3.5' />
            Rename
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1 border-destructive/30 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/5'
            onClick={onDelete}
          >
            <Trash2 className='size-3.5' />
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}
