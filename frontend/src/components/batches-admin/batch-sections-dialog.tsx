'use client';

import { useState } from 'react';
import { Layers } from 'lucide-react';
import { AlertModal } from '@/features/modal/components/alert-modal';
import { Button } from '@/features/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { adminBatchSectionsQueryKey, adminBatchesQueryKey, useBatchSections } from '@/lib/batches-admin/queries';
import { deleteAdminBatchSection } from '@/lib/batches-admin/services';

export function BatchSectionsDialog({
  batchId,
  batchName,
  open,
  onOpenChange
}: {
  batchId: number;
  batchName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: sections = [], isLoading } = useBatchSections(batchId);
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deletion = useMutation({
    mutationFn: deleteAdminBatchSection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['batch-sections', batchId] });
      void queryClient.invalidateQueries({ queryKey: adminBatchSectionsQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminBatchesQueryKey });
      showToast('success', 'Section deleted');
      setDeleteId(null);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete section')
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Sections · {batchName}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className='text-muted-foreground text-sm'>Loading...</p>
          ) : sections.length === 0 ? (
            <p className='text-muted-foreground rounded-md border border-dashed py-6 text-center text-sm'>
              No sections yet.
            </p>
          ) : (
            <div className='space-y-1'>
              {sections.map((section) => (
                <div
                  key={section.id}
                  className='bg-muted/40 flex items-center justify-between rounded-md px-3 py-2'
                >
                  <div className='flex items-center gap-2'>
                    <Layers className='text-muted-foreground size-3.5' />
                    <span className='text-sm font-medium'>{section.name}</span>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-destructive h-7'
                    onClick={() => setDeleteId(section.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertModal
        isOpen={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && deletion.mutate(deleteId)}
        loading={deletion.isPending}
        title='Delete section?'
        description='Students registered in this section may block deletion.'
        confirmLabel='Delete'
      />
    </>
  );
}
