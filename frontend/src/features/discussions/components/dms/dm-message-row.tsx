'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DiscussionMessageMarkdown } from '../../discussion-message-markdown';
import { DiscussionAttachmentCards } from '../../discussion-attachment-cards';
import { DiscussionReactionPillRow } from '../../discussion-message-reactions';
import {
  useAddReaction,
  useDeleteMessage,
  useEditMessage,
  useRemoveReaction
} from '../../api/queries';
import type { DiscussionMessage } from '../../api/types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥'];

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * DM equivalent of MessageRow — slimmer (no thread / no pin / no Q&A).
 *
 * Shares the channel-version's edit/delete/react mutations because backend
 * routes for those (PATCH/DELETE /messages/:id, /messages/:id/reactions)
 * don't care whether the message lives in a channel or a DM. We pass a
 * dummy channelId={0} to those hooks so their cache invalidation no-ops
 * cleanly — the DM cache is updated via the socket handler in
 * useGroupDmMessages.
 */
export function DmMessageRow({
  message,
  myUserId,
  myDisplayName,
  isOwner,
  showHeader,
  onOptimisticPatch,
  onOptimisticReactionToggle,
  tickStatus
}: {
  message: DiscussionMessage;
  myUserId: number | null;
  myDisplayName?: string | null;
  /** True if the calling user is the OWNER of this group DM (can delete others' messages). */
  isOwner: boolean;
  showHeader: boolean;
  /** When provided, edits and deletes patch local state immediately and the
   *  returned thunk reverts on error. */
  onOptimisticPatch?: (
    messageId: number,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  /** When provided, reactions are flipped in local state instantly before
   *  the network mutation fires, and reverted on error. */
  onOptimisticReactionToggle?: (
    messageId: number,
    emoji: string,
    myUserId: number,
    myDisplayName: string
  ) => { wasAdding: boolean };
  /** Read-receipt indicator on YOUR latest sent message. Parent computes
   *  this; row just renders it. */
  tickStatus?: 'seen' | 'sent' | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content ?? '');
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editMutation = useEditMessage(0);
  const deleteMutation = useDeleteMessage(0);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  useEffect(() => {
    if (isEditing) {
      editTextareaRef.current?.focus();
      const length = editTextareaRef.current?.value?.length ?? 0;
      editTextareaRef.current?.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const isAuthor = myUserId != null && message.senderId === myUserId;
  const senderName = message.sender?.full_name ?? 'Unknown';
  const isDeleted = !!message.deletedAt;
  const canDelete = isAuthor || isOwner;
  // Negative ids = optimistic temp from the composer.
  const isPending = message.id < 0;

  const onToggleReaction = (messageId: number, emoji: string) => {
    if (myUserId == null) return;
    const displayName = myDisplayName ?? '';
    if (onOptimisticReactionToggle) {
      const { wasAdding } = onOptimisticReactionToggle(
        messageId,
        emoji,
        myUserId,
        displayName
      );
      const revert = () =>
        onOptimisticReactionToggle(messageId, emoji, myUserId, displayName);
      if (wasAdding) {
        addReaction.mutate({ messageId, emoji }, { onError: revert });
      } else {
        removeReaction.mutate({ messageId, emoji }, { onError: revert });
      }
      return;
    }
    const mine =
      message.reactions?.some(
        (r) => r.emoji === emoji && Number(r.userId) === myUserId
      ) ?? false;
    if (mine) removeReaction.mutate({ messageId, emoji });
    else addReaction.mutate({ messageId, emoji });
  };

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed === (message.content ?? '').trim()) {
      setIsEditing(false);
      return;
    }
    if (onOptimisticPatch) {
      setIsEditing(false);
      const previousValue = editValue;
      const revert = onOptimisticPatch(message.id, {
        content: trimmed,
        editedAt: new Date().toISOString()
      });
      editMutation.mutate(
        { messageId: message.id, body: { content: trimmed || null } },
        {
          onError: () => {
            revert();
            setEditValue(previousValue);
            setIsEditing(true);
          }
        }
      );
      return;
    }
    editMutation.mutate(
      { messageId: message.id, body: { content: trimmed || null } },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = () => {
    if (!window.confirm('Delete this message?')) return;
    if (onOptimisticPatch) {
      const revert = onOptimisticPatch(message.id, {
        deletedAt: new Date().toISOString()
      });
      deleteMutation.mutate(message.id, {
        onError: () => revert()
      });
      return;
    }
    deleteMutation.mutate(message.id);
  };

  return (
    <div
      className={cn(
        'group/row relative flex gap-3 px-6 py-1 transition-colors',
        showHeader && 'mt-2',
        'hover:bg-muted/40',
        isPending && 'opacity-60'
      )}
    >
      <div className='w-10 shrink-0'>
        {showHeader ? (
          <Avatar className='h-9 w-9'>
            <AvatarFallback className='text-xs'>{initialsFor(senderName)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className='block w-10 text-right text-[10px] text-muted-foreground opacity-0 group-hover/row:opacity-100'>
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>

      <div className='min-w-0 flex-1'>
        {showHeader && (
          <div className='mb-0.5 flex items-baseline gap-2'>
            <span className='text-sm font-semibold'>{senderName}</span>
            <span className='text-[11px] text-muted-foreground'>
              {formatTime(message.createdAt)}
            </span>
            {isPending && (
              <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground'>
                <Icons.spinner className='h-3 w-3 animate-spin' />
                Sending…
              </span>
            )}
            {message.editedAt && (
              <span className='text-[11px] text-muted-foreground'>(edited)</span>
            )}
          </div>
        )}

        {isDeleted ? (
          <p className='text-sm italic text-muted-foreground'>This message was deleted.</p>
        ) : isEditing ? (
          <div className='space-y-2'>
            <Textarea
              ref={editTextareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className='min-h-[60px] resize-none'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <div className='flex items-center gap-2 text-xs'>
              <Button size='sm' onClick={submitEdit} disabled={editMutation.isPending}>
                Save
              </Button>
              <Button size='sm' variant='ghost' onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className='text-sm leading-snug'>
            <DiscussionMessageMarkdown text={message.content ?? ''} tone='hybrid' />
          </div>
        )}

        {!isDeleted && message.attachments && message.attachments.length > 0 && (
          <DiscussionAttachmentCards
            attachments={message.attachments.map((a) => ({
              id: a.id,
              fileType: a.fileType,
              mimeType: a.mimeType,
              size: a.size,
              url: a.url,
              accessUrl: a.accessUrl,
              isE2EE: a.isE2EE
            }))}
            tone='hybrid'
          />
        )}

        {!isDeleted && message.reactions && message.reactions.length > 0 && (
          <DiscussionReactionPillRow
            messageId={message.id}
            reactions={message.reactions}
            myUserId={myUserId ?? undefined}
            tone='hybrid'
            onToggle={onToggleReaction}
            showAddPicker={false}
          />
        )}

        {!isDeleted && !isPending && tickStatus && (
          <div
            className='mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground'
            aria-label={tickStatus === 'seen' ? 'Seen' : 'Sent'}
            title={tickStatus === 'seen' ? 'Seen' : 'Sent'}
          >
            {tickStatus === 'seen' ? (
              <>
                <Icons.checks className='h-3 w-3 text-sky-500' />
                <span className='text-sky-600 dark:text-sky-400'>Seen</span>
              </>
            ) : (
              <>
                <Icons.check className='h-3 w-3' />
                <span>Sent</span>
              </>
            )}
          </div>
        )}
      </div>

      {!isDeleted && !isEditing && !isPending && (
        <div
          className={cn(
            'absolute -top-4 right-4 z-10 hidden items-center gap-0.5 rounded-md border bg-popover p-0.5 shadow-md',
            'group-hover/row:flex'
          )}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              type='button'
              variant='ghost'
              size='icon'
              className='h-7 w-7 text-base'
              onClick={() => addReaction.mutate({ messageId: message.id, emoji })}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </Button>
          ))}
          {isAuthor && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={() => {
                setEditValue(message.content ?? '');
                setIsEditing(true);
              }}
              aria-label='Edit message'
            >
              <Icons.edit className='h-3.5 w-3.5' />
            </Button>
          )}
          {canDelete && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-7 w-7 text-destructive hover:text-destructive'
              onClick={handleDelete}
              aria-label='Delete message'
            >
              <Icons.trash className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
