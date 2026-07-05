'use client';

import { Fragment, type ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import { Icons } from '@/components/icons';
import { confirmDelete, showToast } from '@/lib/notifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useAddReaction,
  useDeleteMessage,
  usePinMessage,
  useUnpinMessage
} from '../../api/queries';
import type { DiscussionMessage } from '../../api/types';
import type { DiscussionPermissions } from '../../hooks/use-discussion-permissions';
import { getDiscussionMessagePlaintext } from '../../decode-web-e2e-ciphertext';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

type MessageMenuAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
};

function buildActions({
  message,
  isAuthor,
  isPinned,
  perms,
  inThread,
  onReply,
  onEdit,
  onCopy,
  onTogglePin,
  onDelete
}: {
  message: DiscussionMessage;
  isAuthor: boolean;
  isPinned: boolean;
  perms: DiscussionPermissions;
  inThread: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onCopy: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}): MessageMenuAction[] {
  const items: MessageMenuAction[] = [];

  if (!inThread && perms.canCreateThreads && onReply) {
    items.push({
      key: 'reply',
      label: 'Reply in thread',
      icon: <Icons.chat className='h-4 w-4' />,
      onSelect: onReply
    });
  }

  const copyableText =
    getDiscussionMessagePlaintext({
      content: message.content,
      ciphertext: message.ciphertext,
      messageType: message.messageType
    }) ?? '';
  if (copyableText.trim().length > 0) {
    items.push({
      key: 'copy',
      label: 'Copy text',
      icon: <Icons.share className='h-4 w-4' />,
      onSelect: onCopy
    });
  }

  if (perms.canPin) {
    items.push({
      key: 'pin',
      label: isPinned ? 'Unpin from channel' : 'Pin to channel',
      icon: isPinned ? (
        <Icons.pinOff className='h-4 w-4' />
      ) : (
        <Icons.pin className='h-4 w-4' />
      ),
      onSelect: onTogglePin
    });
  }

  if (isAuthor && onEdit) {
    items.push({
      key: 'edit',
      label: 'Edit message',
      icon: <Icons.edit className='h-4 w-4' />,
      onSelect: onEdit
    });
  }

  const canDelete = isAuthor || perms.canManageMessages;
  if (canDelete) {
    items.push({
      key: 'delete',
      label: 'Delete',
      icon: <Icons.trash className='h-4 w-4' />,
      onSelect: onDelete,
      destructive: true
    });
  }

  return items;
}

function ReactionStrip({
  onReact
}: {
  onReact: (emoji: string) => void;
}) {
  return (
    <div
      role='toolbar'
      aria-label='Quick reactions'
      className='flex items-center gap-0.5 rounded-md border bg-popover px-1 py-1 shadow-md'
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type='button'
          className='flex h-8 w-8 items-center justify-center rounded text-lg transition-transform hover:scale-110 hover:bg-muted'
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

type CommonProps = {
  message: DiscussionMessage;
  channelId: number;
  myUserId: number | null;
  perms: DiscussionPermissions;
  isAuthor: boolean;
  /** Resolved by the parent so we don't call useChannelPins per message row. */
  isPinned: boolean;
  inThread?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  /** Toggle a reaction (with optimism if the row was wired with one).
   *  Provided by MessageRow so the menu and the hover toolbar share one
   *  reaction code path. */
  onReact?: (emoji: string) => void;
  /** When provided, deletes mark the message deleted in local state
   *  immediately and the returned thunk is called on error to roll back. */
  onOptimisticPatch?: (
    messageId: number,
    patch: Partial<DiscussionMessage>
  ) => () => void;
};

function useMessageActions(props: CommonProps) {
  const {
    message,
    channelId,
    perms,
    isAuthor,
    inThread,
    isPinned,
    onReply,
    onEdit,
    onReact: onReactExternal,
    onOptimisticPatch
  } = props;
  const addReaction = useAddReaction();
  const pinMessage = usePinMessage(channelId);
  const unpinMessage = useUnpinMessage(channelId);
  const deleteMessage = useDeleteMessage(channelId);

  const onReact = (emoji: string) => {
    if (onReactExternal) {
      onReactExternal(emoji);
      return;
    }
    addReaction.mutate({ messageId: message.id, emoji });
  };

  const onCopy = () => {
    const text =
      getDiscussionMessagePlaintext({
        content: message.content,
        ciphertext: message.ciphertext,
        messageType: message.messageType
      }) ?? '';
    if (!text) {
      toast.error('Nothing to copy');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  const onTogglePin = () => {
    if (isPinned) {
      unpinMessage.mutate(message.id);
    } else {
      // Pass the full message so the optimistic pin row has a real preview.
      pinMessage.mutate({ messageId: message.id, message });
    }
  };

  const onDelete = async () => {
    if (!(await confirmDelete('this message'))) return;
    if (onOptimisticPatch) {
      // Mark deleted locally — row immediately renders the "(deleted)"
      // placeholder. On server failure we revert and toast.
      const revert = onOptimisticPatch(message.id, {
        deletedAt: new Date().toISOString()
      });
      deleteMessage.mutate(message.id, {
        onError: () => {
          revert();
          showToast('error', 'Failed to delete message');
        }
      });
      return;
    }
    deleteMessage.mutate(message.id);
  };

  const actions = buildActions({
    message,
    isAuthor,
    isPinned,
    perms: perms,
    inThread: !!inThread,
    onReply,
    onEdit,
    onCopy,
    onTogglePin,
    onDelete
  });

  return { actions, onReact };
}

/** Right-click anywhere on the wrapped child to open the WhatsApp/Slack-style menu. */
export function MessageContextWrapper({
  children,
  ...props
}: CommonProps & { children: ReactNode }) {
  const { actions, onReact } = useMessageActions(props);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className='w-60 overflow-visible'
        // Keep the menu inside the viewport even if the right-click landed
        // near an edge.
        collisionPadding={8}
      >
        <div className='-mt-1 mb-1 px-1 pb-1'>
          <ReactionStrip onReact={onReact} />
        </div>
        <ContextMenuSeparator />
        {actions.map((action, idx) => {
          const showSep =
            action.destructive && idx > 0 && !actions[idx - 1]?.destructive;
          return (
            <Fragment key={action.key}>
              {showSep && <ContextMenuSeparator />}
              <ContextMenuItem
                onSelect={action.onSelect}
                className={cn(
                  'gap-2',
                  action.destructive && 'text-destructive focus:text-destructive'
                )}
              >
                {action.icon}
                {action.label}
              </ContextMenuItem>
            </Fragment>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Trigger is a "..." button (provided by parent) that opens the same menu on click. */
export function MessageMoreMenu({
  trigger,
  ...props
}: CommonProps & { trigger: ReactNode }) {
  const { actions, onReact } = useMessageActions(props);

  return (
    <DropdownMenu
      // Mark the parent toolbar as menu-open so it stays visible while the
      // dropdown is mounted — prevents Radix from losing its anchor when the
      // hover toolbar would otherwise hide.
      onOpenChange={(open) => {
        if (typeof document === 'undefined') return;
        const trig = document.querySelector('[data-state="open"][data-slot="dropdown-menu-trigger"]');
        const toolbar = trig?.closest<HTMLElement>('[data-message-toolbar]');
        if (toolbar) toolbar.dataset.menuOpen = open ? 'true' : 'false';
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        side='bottom'
        sideOffset={6}
        collisionPadding={8}
        avoidCollisions
        className='w-60 overflow-visible'
      >
        <div className='-mt-1 mb-1 px-1 pb-1'>
          <ReactionStrip onReact={onReact} />
        </div>
        <DropdownMenuSeparator />
        {actions.map((action, idx) => {
          const showSep =
            action.destructive && idx > 0 && !actions[idx - 1]?.destructive;
          return (
            <Fragment key={action.key}>
              {showSep && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onSelect={action.onSelect}
                className={cn(
                  'gap-2',
                  action.destructive && 'text-destructive focus:text-destructive'
                )}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
