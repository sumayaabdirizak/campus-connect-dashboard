'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  CourseModule,
  CreateResourceData,
  Resource,
  UpdateResourceData,
} from '../../api/resources-types';
import { ResourceFormBody } from './resource-form-body';
import { useResourceFormDialog } from './use-resource-form-dialog';

export function ResourceFormDialog({
  open,
  onOpenChange,
  editing,
  modules,
  defaultModuleId,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Resource | null;
  modules: CourseModule[];
  defaultModuleId?: number | null;
  pending: boolean;
  onSubmit: (
    payload:
      | { mode: 'create'; data: Omit<CreateResourceData, 'teacherId'> & { is_draft?: boolean } }
      | { mode: 'edit'; resourceId: number; data: UpdateResourceData }
  ) => void;
}) {
  const api = useResourceFormDialog({ open, editing, defaultModuleId, onSubmit });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit material' : 'Add material'}</DialogTitle>
        </DialogHeader>
        <ResourceFormBody
          form={api.form}
          editing={!!editing}
          modules={modules}
          pending={pending}
          uploading={api.uploadMutation.isPending}
          fileInputRef={api.fileInputRef}
          audioInputRef={api.audioInputRef}
          videoInputRef={api.videoInputRef}
          onPickFile={api.handlePickFile}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
