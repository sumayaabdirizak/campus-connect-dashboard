import { Icons } from '@/components/icons';
import type { DiscussionMessage } from '../../api/types';
import type { DiscussionPermissions } from '../../hooks/use-discussion-permissions';
import { getDiscussionMessagePlaintext } from '../../decode-web-e2e-ciphertext';
import type { MessageMenuAction } from './message-menu-types';

export function buildMessageActions({
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
