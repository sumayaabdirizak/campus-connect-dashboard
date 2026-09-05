'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/features/modal/components/alert-modal';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { adminBatchSectionsQueryKey, adminBatchesQueryKey } from '@/lib/batches-admin/queries';
import { deleteAdminBatch, type AdminBatch } from '@/lib/batches-admin/services';
import { BatchSectionsDialog } from './batch-sections-dialog';

export function BatchRowActions({ batch }: { batch: AdminBatch }) {
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const deletion = useMutation({
    mutationFn: deleteAdminBatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBatchesQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminBatchSectionsQueryKey });
      showToast('success', 'Batch deleted');
      setDeleteOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete batch')
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type='button' variant='ghost' size='icon' className='size-8' aria-label='Actions'>
            <Icons.ellipsis className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44'>
          <DropdownMenuItem onClick={() => setSectionsOpen(true)}>View sections</DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BatchSectionsDialog
        batchId={batch.id}
        batchName={batch.name}
        open={sectionsOpen}
        onOpenChange={setSectionsOpen}
      />
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deletion.mutate(batch.id)}
        loading={deletion.isPending}
        title='Delete batch?'
        description={`Delete ${batch.name}? Remove sections and registrations first if deletion fails.`}
        confirmLabel='Delete'
      />
    </>
  );
}
