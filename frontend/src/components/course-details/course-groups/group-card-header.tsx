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
    <div className='flex items-center justify-between mb-3'>
      {renaming ? (
        <GroupRenameForm
          value={renameValue}
          onChange={onRenameValueChange}
          onSubmit={onRenameSubmit}
          onCancel={onRenameCancel}
        />
      ) : (
        <div className='flex items-center gap-1.5'>
          <h3 className='font-medium'>{name}</h3>
          {!isStudent ? (
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              onClick={onStartRename}
            >
              <Pencil className='w-3 h-3' />
            </Button>
          ) : null}
        </div>
      )}
      {!isStudent && !renaming ? (
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-destructive'
          onClick={onDelete}
        >
          <Trash2 className='w-4 h-4' />
        </Button>
      ) : null}
    </div>
  );
}
