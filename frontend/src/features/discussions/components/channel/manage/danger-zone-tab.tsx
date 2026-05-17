'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useArchiveChannel, useHardDeleteChannel } from '../../../api/queries';
import { useDiscussionPermissions } from '../../../hooks/use-discussion-permissions';
import type { DiscussionChannel } from '../../../api/types';

export function DangerZoneTab({
  channel,
  myChannelPermissions,
  myServerPermissions,
  onArchiveSuccess,
  onChannelHardDeleted
}: {
  channel: DiscussionChannel;
  myChannelPermissions: string | null | undefined;
  myServerPermissions: string | null | undefined;
  onArchiveSuccess: () => void;
  onChannelHardDeleted?: () => void;
}) {
  const archiveMut = useArchiveChannel(channel.id);
  const deleteMut = useHardDeleteChannel(channel.id);
  const channelPerms = useDiscussionPermissions(myChannelPermissions);
  const serverPerms = useDiscussionPermissions(myServerPermissions);
  const isArchived = !!channel.archivedAt;

  const canHardDelete =
    channelPerms.canManageChannel &&
    serverPerms.canManageServer &&
    !channel.isDefault;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const confirmName = channel.name?.trim() ?? '';
  const deleteConfirmMatches =
    deleteConfirmText.trim().toLowerCase() === confirmName.toLowerCase() &&
    confirmName.length > 0;

  const handleArchiveToggle = () => {
    if (archiveMut.isPending) return;
    if (isArchived) {
      archiveMut.mutate(false, { onSuccess: () => onArchiveSuccess() });
      return;
    }
    if (
      !window.confirm(
        'Archive this channel? Members will no longer see it in the sidebar. You can restore it later.'
      )
    ) {
      return;
    }
    archiveMut.mutate(true, { onSuccess: () => onArchiveSuccess() });
  };

  const openDelete = () => {
    setDeleteConfirmText('');
    setDeleteOpen(true);
  };

  const submitDelete = () => {
    if (!deleteConfirmMatches) return;
    deleteMut.mutate(channel.serverId, {
      onSuccess: () => {
        setDeleteOpen(false);
        onChannelHardDeleted?.();
      }
    });
  };

  return (
    <div className='space-y-3'>
      <div className='rounded-md border border-destructive/30 bg-destructive/5 p-4'>
        <div className='mb-1 flex items-center gap-1.5 text-sm font-semibold'>
          <Icons.warning className='h-4 w-4 text-destructive' />
          {isArchived ? 'Channel is archived' : 'Archive channel'}
        </div>
        <p className='mb-3 text-xs text-muted-foreground'>
          {isArchived
            ? 'Restore to make it visible to members again. Messages and pins are preserved.'
            : 'Hides the channel from the sidebar without deleting messages or pins. You can restore it later.'}
        </p>
        <Button
          type='button'
          variant={isArchived ? 'default' : 'outline'}
          size='sm'
          onClick={handleArchiveToggle}
          disabled={archiveMut.isPending}
        >
          {archiveMut.isPending ? (
            <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
          ) : null}
          {isArchived ? 'Restore channel' : 'Archive channel'}
        </Button>
      </div>

      <div className='rounded-md border border-destructive/30 bg-destructive/5 p-4'>
        <div className='mb-1 flex items-center gap-1.5 text-sm font-semibold'>
          <Icons.warning className='h-4 w-4 text-destructive' />
          Delete channel permanently
        </div>
        <p className='mb-3 text-xs text-muted-foreground'>
          Removes the channel and all of its messages, attachments, and pins.
          This cannot be undone. The channel must be archived first. Requires
          Manage channel and Manage server.
        </p>
        {channel.isDefault ? (
          <p className='mb-2 text-xs text-muted-foreground'>
            The server&apos;s default channel cannot be deleted.
          </p>
        ) : null}
        {!channel.isDefault && isArchived && !serverPerms.canManageServer ? (
          <p className='mb-2 text-xs text-muted-foreground'>
            You need Manage server (in addition to Manage channel) to delete this
            channel.
          </p>
        ) : null}
        <Button
          type='button'
          variant='destructive'
          size='sm'
          onClick={openDelete}
          disabled={
            !isArchived ||
            !canHardDelete ||
            deleteMut.isPending ||
            archiveMut.isPending
          }
        >
          {deleteMut.isPending ? (
            <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
          ) : null}
          Delete permanently…
        </Button>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!next) setDeleteConfirmText('');
          setDeleteOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete <span className='font-mono'>#{confirmName || 'channel'}</span>{' '}
              forever?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All messages, attachments, and pins in this channel will be removed
              for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='space-y-1.5'>
            <Label htmlFor='delete-channel-confirm' className='text-xs'>
              Type <span className='font-mono'>{confirmName}</span> to confirm
            </Label>
            <Input
              id='delete-channel-confirm'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={confirmName}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90'
              disabled={!deleteConfirmMatches || deleteMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                submitDelete();
              }}
            >
              {deleteMut.isPending ? (
                <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
              ) : null}
              Delete channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
