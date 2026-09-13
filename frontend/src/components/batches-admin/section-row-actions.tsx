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
import { deleteAdminBatchSection, type BatchSection } from '@/lib/batches-admin/services';
import { SectionAddStudentsModal } from './section-add-students-modal';

export function SectionRowActions({ section }: { section: BatchSection }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const deletion = useMutation({
    mutationFn: deleteAdminBatchSection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBatchSectionsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['batch-sections', section.batchId] });
      void queryClient.invalidateQueries({ queryKey: adminBatchesQueryKey });
      showToast('success', 'Section deleted');
      setDeleteOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete section')
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
          <DropdownMenuItem onClick={() => setAddOpen(true)}>Add students</DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SectionAddStudentsModal section={section} open={addOpen} onOpenChange={setAddOpen} />

      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deletion.mutate(section.id)}
        loading={deletion.isPending}
        title='Delete section?'
        description={`Delete ${section.name}? Students registered here may block deletion.`}
        confirmLabel='Delete'
      />
    </>
  );
}
