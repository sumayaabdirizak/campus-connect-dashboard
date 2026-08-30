'use client';

import { AssignmentModalShell } from './assignment-modal-shell';
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
    <AssignmentModalShell
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title='Edit assignment'
      mode='edit'
    >
      {target ? (
        <CreateAssignmentForm
          initialValues={initialValues}
          onSubmit={onSubmit}
          pending={pending}
          onCancel={onClose}
          submitLabel='Save'
          pendingLabel='Saving…'
          showSubmitIcon={false}
        />
      ) : null}
    </AssignmentModalShell>
  );
}
