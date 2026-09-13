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
import { deleteUserMutation } from '@/lib/users/queries/mutations';
import type { User } from '@/lib/users/types';
import { ManageRolesDialog } from './manage-roles-dialog';
import { UserFormModal } from './user-form-modal';

export function UserRowActions({ user }: { user: User }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rolesUserId, setRolesUserId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const deletion = useMutation({
    ...deleteUserMutation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('success', 'User deleted');
      setDeleteOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete user')
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type='button' variant='ghost' size='icon' className='size-8' aria-label='Actions'>
            <Icons.ellipsis className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-40'>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRolesUserId(user.id)}>Manage roles</DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManageRolesDialog
        userId={rolesUserId}
        userName={user.full_name}
        onOpenChange={(open) => !open && setRolesUserId(null)}
      />

      <UserFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        user={{
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          number: user.number ?? '',
          role: user.role
        }}
      />

      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deletion.mutate(user.id)}
        loading={deletion.isPending}
        title='Delete user?'
        description={`Delete ${user.full_name}? This fails if the account has related academic records.`}
        confirmLabel='Delete'
      />
    </>
  );
}
