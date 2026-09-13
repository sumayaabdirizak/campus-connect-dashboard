'use client';

import { Button } from '@/features/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { StudyGroupForm } from '../study-group-form';
import type { StudyGroupFormValues } from '@/lib/course-details/schemas/study-group';

export function GroupsDialogs({
  createOpen,
  onCreateOpenChange,
  onCreate,
  createPending,
  deleteId,
  onDeleteIdChange,
  onConfirmDelete,
  deletePending
}: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCreate: (values: StudyGroupFormValues) => void;
  createPending: boolean;
  deleteId: number | null;
  onDeleteIdChange: (id: number | null) => void;
  onConfirmDelete: (id: number) => void;
  deletePending: boolean;
}) {
  return (
    <>
      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <StudyGroupForm
            onSubmit={onCreate}
            onCancel={() => onCreateOpenChange(false)}
            submitting={createPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && onDeleteIdChange(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete Group?</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            This will remove the group and all its members. Existing submissions will keep
            their grades but lose the group association.
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => onDeleteIdChange(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => deleteId != null && onConfirmDelete(deleteId)}
              disabled={deletePending}
            >
              {deletePending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
