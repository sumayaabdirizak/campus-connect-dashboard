'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Icons } from '@/components/icons';
import type { ChannelMember } from '../../../../api/types';

interface KickConfirmDialogProps {
  target: ChannelMember | null;
  confirmText: string;
  setConfirmText: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function KickConfirmDialog({
  target,
  confirmText,
  setConfirmText,
  onClose,
  onSubmit,
  isPending
}: KickConfirmDialogProps) {
  const name = target?.user?.full_name?.trim() ?? '';
  const matches =
    confirmText.trim().toLowerCase() === name.toLowerCase() && name.length > 0;

  return (
    <AlertDialog open={target != null} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {name || 'member'} from the server?
          </AlertDialogTitle>
          <AlertDialogDescription>
            They’ll lose access to every channel in this server until re-invited.
            Their messages and pins stay where they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className='space-y-1.5'>
          <Label htmlFor='kick-confirm' className='text-xs'>
            Type <span className='font-mono'>{name}</span> to confirm
          </Label>
          <Input
            id='kick-confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={name}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className='bg-destructive text-white hover:bg-destructive/90'
            disabled={!matches || isPending}
            onClick={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {isPending ? (
              <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
            ) : null}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
