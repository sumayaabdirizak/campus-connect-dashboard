'use client';

import type { RefObject } from 'react';
import { Paperclip, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  CreateAssignmentForm,
  type AssignmentFormValues
} from './create-assignment-form';

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingFiles: File[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onSubmit: (values: AssignmentFormValues) => void;
  pending: boolean;
}

export function CreateAssignmentDialog({
  open,
  onOpenChange,
  pendingFiles,
  fileInputRef,
  onPickFiles,
  onRemoveFile,
  onSubmit,
  pending
}: CreateAssignmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>
        <div className='space-y-2'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            onChange={onPickFiles}
            className='hidden'
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1'
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className='w-4 h-4' /> Add attachments
          </Button>
          {pendingFiles.length > 0 ? (
            <ul className='space-y-1'>
              {pendingFiles.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className='flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1'
                >
                  <span className='truncate'>
                    {f.name}{' '}
                    <span className='text-muted-foreground'>
                      ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                  </span>
                  <button
                    type='button'
                    onClick={() => onRemoveFile(i)}
                    className='text-muted-foreground hover:text-destructive shrink-0 ml-2'
                    aria-label='Remove file'
                  >
                    <XIcon className='w-3.5 h-3.5' />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className='text-[10px] text-muted-foreground'>Up to 10 files, 25 MB each.</p>
        </div>
        <CreateAssignmentForm
          onSubmit={onSubmit}
          pending={pending}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
