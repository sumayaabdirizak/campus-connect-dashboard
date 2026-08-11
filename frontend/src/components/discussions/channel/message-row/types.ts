import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions';

export interface MessageRowProps {
  message: DiscussionMessage;
  channelId: string;
  myUserId: number | null;
  myDisplayName?: string | null;
  perms: DiscussionPermissions;
  showHeader: boolean;
  isPinned?: boolean;
  onReplyInThread?: (messageId: string) => void;
  onQuoteReply?: (message: DiscussionMessage) => void;
  onJumpToReply?: (messageId: string) => void;
  onOptimisticReactionToggle?: (
    messageId: string,
    emoji: string,
    myUserId: number,
    myDisplayName: string
  ) => { wasAdding: boolean };
  onOptimisticPatch?: (
    messageId: string,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  inThread?: boolean;
}
