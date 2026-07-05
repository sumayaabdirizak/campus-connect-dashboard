'use client';

import { useEffect, useRef, useState } from 'react';
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
import { confirmDelete } from '@/lib/notifications';
import type { DiscussionMessage } from '../../api/types';
import { avatarSolid } from '../../utils/avatar-color';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥'];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * DM message row — WhatsApp-style chat bubble.
 *
 * Your messages sit on the right in a green bubble; everyone else's on the
 * left in a neutral bubble (with their name, colored per-person, for group
 * DMs). Time + read-ticks live inside the bubble bottom-right.
 *
 * Shares the channel-version's edit/delete/react mutations because the backend
 * routes for those (PATCH/DELETE /messages/:id, /messages/:id/reactions) don't
 * care whether the message lives in a channel or a DM. We pass a dummy
 * channelId={0} so their cache invalidation no-ops cleanly — the DM cache is
 * updated via the socket handler in useGroupDmMessages.
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

  const handleDelete = async () => {
    if (!(await confirmDelete('this message'))) return;
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

  // ── Editing takes over the row with a plain (non-bubble) editor ───────────
  if (isEditing) {
    return (
      <div className={cn('flex px-4 py-0.5', isAuthor ? 'justify-end' : 'justify-start')}>
        <div className='w-full max-w-[75%] space-y-2 rounded-lg border bg-background p-2'>
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
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group/row flex px-4 py-0.5',
        isAuthor ? 'justify-end' : 'justify-start',
        showHeader && 'mt-1.5',
        isPending && 'opacity-70'
      )}
    >
      <div
        className={cn(
          'flex min-w-0 max-w-[75%] flex-col',
          isAuthor ? 'items-end' : 'items-start'
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            'relative w-fit max-w-full rounded-2xl px-2.5 py-1.5 shadow-sm',
            isAuthor
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm border bg-card text-card-foreground'
          )}
        >
          {/* Hover action bar — anchored to the bubble's inner edge. */}
          {!isDeleted && !isPending && (
            <div
              className={cn(
                'absolute top-0 z-10 hidden items-center gap-0.5 rounded-full border bg-popover p-0.5 shadow-md',
                'group-hover/row:flex',
                isAuthor ? 'right-full mr-1' : 'left-full ml-1'
              )}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <Button
                  key={emoji}
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-base'
                  onClick={() => onToggleReaction(message.id, emoji)}
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

          {/* Sender name (group DMs) — only for others, colored per-person. */}
          {!isAuthor && !isDeleted && (
            <div
              className='mb-0.5 text-xs font-semibold'
              style={{ color: avatarSolid(senderName) }}
            >
              {senderName}
            </div>
          )}

          {isDeleted ? (
            <p className='text-sm italic opacity-60'>This message was deleted.</p>
          ) : (
            <div className='text-sm leading-snug [overflow-wrap:anywhere]'>
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

          {/* Meta: edited · time · ticks, bottom-right inside the bubble. */}
          {!isDeleted && (
            <div
              className={cn(
                'mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none',
                isAuthor ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {message.editedAt && <span>edited</span>}
              <span className='tabular-nums'>{formatTime(message.createdAt)}</span>
              {isAuthor &&
                (isPending ? (
                  <Icons.spinner className='h-3 w-3 animate-spin' />
                ) : (
                  <Icons.checks
                    className={cn(
                      'h-3.5 w-3.5',
                      tickStatus === 'seen' && 'text-emerald-300'
                    )}
                    aria-label={tickStatus === 'seen' ? 'Seen' : 'Delivered'}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Reactions sit just under the bubble, aligned to the same side. */}
        {!isDeleted && message.reactions && message.reactions.length > 0 && (
          <div className='mt-0.5'>
            <DiscussionReactionPillRow
              messageId={message.id}
              reactions={message.reactions}
              myUserId={myUserId ?? undefined}
              tone='hybrid'
              onToggle={onToggleReaction}
              showAddPicker={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
