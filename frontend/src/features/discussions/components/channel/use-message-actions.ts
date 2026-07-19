'use client';

import { confirmDelete, showToast } from '@/lib/notifications';
import { toast } from 'sonner';
import {
  useAddReaction,
  useDeleteMessage,
  usePinMessage,
  useUnpinMessage
} from '../../api/queries';
import { getDiscussionMessagePlaintext } from '../../decode-web-e2e-ciphertext';
import { buildMessageActions } from './build-message-actions';
import type { MessageActionsCommonProps } from './message-menu-types';

export function useMessageActions(props: MessageActionsCommonProps) {
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
      pinMessage.mutate({ messageId: message.id, message });
    }
  };

  const onDelete = async () => {
    if (!(await confirmDelete('this message'))) return;
    if (onOptimisticPatch) {
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

  const actions = buildMessageActions({
    message,
    isAuthor,
    isPinned,
    perms,
    inThread: !!inThread,
    onReply,
    onEdit,
    onCopy,
    onTogglePin,
    onDelete
  });

  return { actions, onReact };
}
