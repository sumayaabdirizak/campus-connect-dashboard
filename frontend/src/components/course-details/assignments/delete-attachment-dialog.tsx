'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

export function DeleteAttachmentDialog({
  target,
  onClose,
  onConfirm
}: {
  target: { assignmentId: number; attachmentId: number; name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
          <AlertDialogDescription>
            <span>
              Remove <strong>{target?.name}</strong>? Students will lose access. This
              can&apos;t be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
