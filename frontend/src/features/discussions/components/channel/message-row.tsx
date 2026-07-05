'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DiscussionMessageMarkdown } from '../../discussion-message-markdown';
import { DiscussionAttachmentCards } from '../../discussion-attachment-cards';
import { DiscussionReactionPillRow } from '../../discussion-message-reactions';
import {
  useAddReaction,
  useEditMessage,
  useRemoveReaction
} from '../../api/queries';
import type { DiscussionMessage } from '../../api/types';
import type { DiscussionPermissions } from '../../hooks/use-discussion-permissions';
import { MessageContextWrapper, MessageMoreMenu } from './message-actions-menu';
import { getDiscussionMessagePlaintext } from '../../decode-web-e2e-ciphertext';
import { avatarGradient, avatarSolid } from '../../utils/avatar-color';

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

function MessageActionsToolbar({
  message,
  channelId,
  isAuthor,
  perms,
  isPinned,
  onEdit,
  onReplyInThread,
  onQuickReact,
  onOptimisticPatch,
  inThread
}: {
  message: DiscussionMessage;
  channelId: number;
  isAuthor: boolean;
  myUserId: number | null;
  perms: DiscussionPermissions;
  isPinned: boolean;
  onEdit: () => void;
  onReplyInThread?: (messageId: number) => void;
  /** Receives a click on either the quick row or the picker. The parent
   *  is responsible for both the optimistic flip and the network mutation. */
  onQuickReact: (emoji: string) => void;
  onOptimisticPatch?: (
    messageId: number,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  inThread: boolean;
}) {

  return (
    <div
      data-message-toolbar
      // Always mounted (so the kebab has a stable bounding rect for Radix to
      // anchor menus against) but invisible and non-interactive until hover.
      // Using `hidden` here was causing the More menu to fall back to viewport
      // (0,0) when hover briefly disengaged while the menu opened.
      className={cn(
        'pointer-events-none absolute top-0 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 opacity-0 shadow-lg transition-opacity',
        isAuthor ? 'right-full mr-1' : 'left-full ml-1',
        'group-hover/row:pointer-events-auto group-hover/row:opacity-100',
        'focus-within:pointer-events-auto focus-within:opacity-100',
        'data-[menu-open=true]:pointer-events-auto data-[menu-open=true]:opacity-100'
      )}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <Button
          key={emoji}
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-base'
          onClick={() => onQuickReact(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            aria-label='Pick reaction'
          >
            <Icons.add className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-64 p-2'>
          <div className='grid grid-cols-8 gap-0.5'>
            {['👍', '❤️', '😂', '🎉', '🔥', '🙏', '✅', '📌', '🤔', '👀', '✨', '💯', '🚀', '👏', '😢', '😡'].map(
              (em) => (
                <button
                  key={em}
                  type='button'
                  className='flex h-8 items-center justify-center rounded text-lg hover:bg-muted'
                  onClick={() => onQuickReact(em)}
                >
                  {em}
                </button>
              )
            )}
          </div>
        </PopoverContent>
      </Popover>
      <MessageMoreMenu
        message={message}
        channelId={channelId}
        myUserId={null}
        perms={perms}
        isAuthor={isAuthor}
        isPinned={isPinned}
        inThread={inThread}
        onReply={onReplyInThread ? () => onReplyInThread(message.id) : undefined}
        onReact={onQuickReact}
        onOptimisticPatch={onOptimisticPatch}
        onEdit={onEdit}
        trigger={
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            aria-label='More actions'
          >
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        }
      />
    </div>
  );
}

export function MessageRow({
  message,
  channelId,
  myUserId,
  myDisplayName,
  perms,
  showHeader,
  isPinned = false,
  onReplyInThread,
  onOptimisticReactionToggle,
  onOptimisticPatch,
  /** Hide thread-related affordances when this row is rendered inside a thread panel. */
  inThread = false
}: {
  message: DiscussionMessage;
  channelId: number;
  myUserId: number | null;
  /** Display name for the current user — used to render their reaction
   *  optimistically with their name in the tooltip until the socket echoes. */
  myDisplayName?: string | null;
  perms: DiscussionPermissions;
  /** When false, the avatar/name/time row is hidden (consecutive message from same sender). */
  showHeader: boolean;
  isPinned?: boolean;
  onReplyInThread?: (messageId: number) => void;
  /** When provided, reactions are flipped in local state instantly before
   *  the network mutation fires, and reverted on error. */
  onOptimisticReactionToggle?: (
    messageId: number,
    emoji: string,
    myUserId: number,
    myDisplayName: string
  ) => { wasAdding: boolean };
  /** When provided, edits and deletes patch the local message immediately
   *  and the returned thunk is called on error to roll back. */
  onOptimisticPatch?: (
    messageId: number,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  inThread?: boolean;
}) {
  // Resolved plaintext — decoded from web-shaped ciphertext when `content` is null.
  const messagePlaintext =
    getDiscussionMessagePlaintext({
      content: message.content,
      ciphertext: message.ciphertext,
      messageType: message.messageType
    }) ?? '';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(messagePlaintext);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editMutation = useEditMessage(channelId);

  useEffect(() => {
    if (isEditing) {
      editTextareaRef.current?.focus();
      const length = editTextareaRef.current?.value?.length ?? 0;
      editTextareaRef.current?.setSelectionRange(length, length);
    }
  }, [isEditing]);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  const isAuthor = myUserId != null && message.senderId === myUserId;
  const senderName = message.isAnonymous
    ? 'Anonymous'
    : message.sender?.full_name ?? 'Unknown';

  const isDeleted = !!message.deletedAt;
  // Negative ids are reserved for client-side optimistic temps. They render
  // dimmed with a "Sending…" affordance until the server replaces them.
  const isPending = message.id < 0;

  const onToggleReaction = (messageId: number, emoji: string) => {
    if (myUserId == null) return;
    const displayName = myDisplayName ?? '';
    if (onOptimisticReactionToggle) {
      // Flip local state instantly. The function returns whether it added
      // or removed, so we can fire the matching mutation and roll back on
      // error by toggling again.
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
    // Fallback path (no optimistic API wired in by parent — e.g. thread
    // panel until that gets the same lift).
    const mine =
      message.reactions?.some(
        (r) => r.emoji === emoji && Number(r.userId) === myUserId
      ) ?? false;
    if (mine) {
      removeReaction.mutate({ messageId, emoji });
    } else {
      addReaction.mutate({ messageId, emoji });
    }
  };

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed === messagePlaintext.trim()) {
      setIsEditing(false);
      return;
    }
    // Close the editor immediately and patch the row in place — feels
    // instant. The mutation runs in background; on error we revert and
    // re-open the editor so the user doesn't lose their typing.
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
      {
        onSuccess: () => setIsEditing(false)
      }
    );
  };

  const rowBody = (
    <div
      className={cn(
        'group/row flex gap-2 px-3 py-0.5',
        isAuthor ? 'justify-end' : 'justify-start',
        showHeader ? 'mt-2' : '',
        isPending && 'opacity-60'
      )}
    >
      {/* Left avatar for others (WhatsApp group style); none for your own. */}
      {!isAuthor && (
        <Avatar className='mt-0.5 h-8 w-8 shrink-0 self-end shadow-sm ring-1 ring-black/5'>
          <AvatarFallback
            className='text-[10px] font-semibold text-white'
            style={{ background: avatarGradient(senderName, message.isAnonymous) }}
          >
            {initialsFor(senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'flex min-w-0 max-w-[75%] flex-col',
          isAuthor ? 'items-end' : 'items-start'
        )}
      >
        {isEditing ? (
          <div className='w-full space-y-2 rounded-lg border bg-background p-2'>
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
                if (e.key === 'Escape') {
                  setIsEditing(false);
                }
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
              <MessageActionsToolbar
                message={message}
                channelId={channelId}
                isAuthor={isAuthor}
                myUserId={myUserId}
                perms={perms}
                isPinned={isPinned}
                inThread={inThread}
                onReplyInThread={onReplyInThread}
                onQuickReact={(emoji) => onToggleReaction(message.id, emoji)}
                onOptimisticPatch={onOptimisticPatch}
                onEdit={() => {
                  setEditValue(messagePlaintext);
                  setIsEditing(true);
                }}
              />
            )}

            {/* Sender name (others) + anonymous / question badges. */}
            {!isDeleted &&
              (!isAuthor ||
                message.isAnonymous ||
                message.messageType === 'QUESTION') && (
                <div className='mb-0.5 flex items-center gap-1.5'>
                  {!isAuthor && (
                    <span
                      className='text-xs font-semibold'
                      style={{ color: avatarSolid(senderName, message.isAnonymous) }}
                    >
                      {senderName}
                    </span>
                  )}
                  {message.isAnonymous && (
                    <span className='rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
                      anonymous
                    </span>
                  )}
                  {message.messageType === 'QUESTION' && (
                    <span className='rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
                      question
                    </span>
                  )}
                </div>
              )}

            {isDeleted ? (
              <p className='text-sm italic opacity-60'>This message was deleted.</p>
            ) : (
              (() => {
                // Web client posts E2EE-shaped payloads where the "ciphertext"
                // is base64(utf-8 plaintext); decode it locally so the user
                // sees their own message instead of the 🔒 placeholder. Real
                // opaque ciphertext (from a different client) returns null and
                // we keep the placeholder.
                const plain = getDiscussionMessagePlaintext({
                  content: message.content,
                  ciphertext: message.ciphertext,
                  messageType: message.messageType
                });
                if (plain && plain.trim().length > 0) {
                  return (
                    <div className='text-sm leading-snug [overflow-wrap:anywhere]'>
                      <DiscussionMessageMarkdown text={plain} tone='hybrid' />
                    </div>
                  );
                }
                if (message.ciphertext) {
                  return <p className='text-sm opacity-70'>🔒 Encrypted message</p>;
                }
                return null;
              })()
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

            {/* Meta: edited · time (+ sending state), bottom-right in bubble. */}
            <div
              className={cn(
                'mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none',
                isAuthor ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {message.editedAt && <span>edited</span>}
              {isPending ? (
                <span className='inline-flex items-center gap-1'>
                  <Icons.spinner className='h-3 w-3 animate-spin' /> Sending…
                </span>
              ) : (
                <span className='tabular-nums'>{formatTime(message.createdAt)}</span>
              )}
            </div>
          </div>
        )}

        {/* Reactions sit just under the bubble, aligned to the same side. */}
        {!isDeleted && !isEditing && message.reactions && message.reactions.length > 0 && (
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

        {/* Thread preview, aligned to the same side. */}
        {!isDeleted && !inThread && message.threadPreview && message.threadPreview.replyCount > 0 && (
          <button
            type='button'
            onClick={() => onReplyInThread?.(message.id)}
            className='mt-1.5 flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground'
          >
            <Icons.chat className='h-3 w-3' />
            <span>
              {message.threadPreview.replyCount}{' '}
              {message.threadPreview.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {message.threadPreview.lastReplyAt && (
              <span className='text-[10px] opacity-70'>
                Last reply {new Date(message.threadPreview.lastReplyAt).toLocaleString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );

  // Pending optimistic messages, deleted messages, and rows in edit mode all
  // skip the right-click context menu — they're not interactable yet.
  if (isDeleted || isEditing || isPending) return rowBody;

  return (
    <MessageContextWrapper
      message={message}
      channelId={channelId}
      myUserId={myUserId}
      perms={perms}
      isAuthor={isAuthor}
      isPinned={isPinned}
      inThread={inThread}
      onReply={onReplyInThread ? () => onReplyInThread(message.id) : undefined}
      onReact={(emoji) => onToggleReaction(message.id, emoji)}
      onOptimisticPatch={onOptimisticPatch}
      onEdit={() => {
        setEditValue(messagePlaintext);
        setIsEditing(true);
      }}
    >
      {rowBody}
    </MessageContextWrapper>
  );
}
