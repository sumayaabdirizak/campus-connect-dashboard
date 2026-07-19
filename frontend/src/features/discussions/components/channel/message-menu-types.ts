import type { ReactNode } from 'react';
import type { DiscussionMessage } from '../../api/types';
import type { DiscussionPermissions } from '../../hooks/use-discussion-permissions';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export type MessageMenuAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
};

export type MessageActionsCommonProps = {
  message: DiscussionMessage;
  channelId: number;
  myUserId: number | null;
  perms: DiscussionPermissions;
  isAuthor: boolean;
  isPinned: boolean;
  inThread?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onReact?: (emoji: string) => void;
  onOptimisticPatch?: (
    messageId: number,
    patch: Partial<DiscussionMessage>
  ) => () => void;
};
