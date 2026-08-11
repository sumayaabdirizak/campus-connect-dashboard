import type { ReactNode } from 'react';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions';

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
  channelId: string;
  myUserId: number | null;
  perms: DiscussionPermissions;
  isAuthor: boolean;
  isPinned: boolean;
  inThread?: boolean;
  onReply?: () => void;
  onQuoteReply?: () => void;
  onEdit?: () => void;
  onReact?: (emoji: string) => void;
  onOptimisticPatch?: (
    messageId: string,
    patch: Partial<DiscussionMessage>
  ) => () => void;
};
