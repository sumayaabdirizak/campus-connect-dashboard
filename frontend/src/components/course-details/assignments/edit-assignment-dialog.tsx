'use client';

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
import type { Assignment } from '@/lib/course-details/services/assignments-types';

interface EditAssignmentDialogProps {
  target: Assignment | null;
  initialValues?: Partial<AssignmentFormValues>;
  onClose: () => void;
  onSubmit: (values: AssignmentFormValues) => void;
  pending: boolean;
}

export function EditAssignmentDialog({
  target,
  initialValues,
  onClose,
  onSubmit,
  pending
}: EditAssignmentDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit assignment</DialogTitle>
        </DialogHeader>
        {target ? (
          <CreateAssignmentForm
            initialValues={initialValues}
            onSubmit={onSubmit}
            pending={pending}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
