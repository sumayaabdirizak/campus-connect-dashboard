'use client';

import type { RefObject } from 'react';
import { AssignmentAttachmentsField } from './assignment-attachments-field';
import { AssignmentModalShell } from './assignment-modal-shell';
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
  onAddFiles: (files: File[]) => void;
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
  onAddFiles,
  onRemoveFile,
  onSubmit,
  pending
}: CreateAssignmentDialogProps) {
  return (
    <AssignmentModalShell
      open={open}
      onOpenChange={onOpenChange}
      title='Create assignment'
      mode='create'
    >
      <CreateAssignmentForm
        onSubmit={onSubmit}
        pending={pending}
        onCancel={() => onOpenChange(false)}
        extraFields={
          <AssignmentAttachmentsField
            files={pendingFiles}
            fileInputRef={fileInputRef}
            onPickFiles={onPickFiles}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
          />
        }
      />
    </AssignmentModalShell>
  );
}
