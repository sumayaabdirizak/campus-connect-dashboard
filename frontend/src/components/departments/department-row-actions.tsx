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
import { useAuthStore } from '@/lib/auth-store';
import { handleApiError, showToast } from '@/lib/notifications';
import { deleteDepartment } from '@/lib/departments/services';
import type { Department } from '@/lib/departments/types';
import { DepartmentFormSheet } from './DepartmentFormSheet';

export function DepartmentRowActions({ department }: { department: Department }) {
  const role = useAuthStore((state) => state.user?.role);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const deletion = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      showToast('success', 'Department deleted successfully');
      setDeleteOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete department')
  });

  if (role !== 'SUPER_ADMIN') {
    return <span className='text-muted-foreground text-xs'>View only</span>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type='button' variant='ghost' size='icon' className='size-8' aria-label='Actions'>
            <Icons.ellipsis className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-36'>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DepartmentFormSheet
        department={{ ...department, status: 'active' }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deletion.mutate(department.id)}
        loading={deletion.isPending}
        title='Delete department?'
        description={`Delete ${department.name}? Related programs may prevent deletion.`}
        confirmLabel='Delete'
      />
    </>
  );
}
