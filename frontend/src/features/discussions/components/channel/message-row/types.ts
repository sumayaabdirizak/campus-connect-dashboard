import type { DiscussionMessage } from '../../../api/types';
import type { DiscussionPermissions } from '../../../hooks/use-discussion-permissions';

export interface MessageRowProps {
  message: DiscussionMessage;
  channelId: number;
  myUserId: number | null;
  myDisplayName?: string | null;
  perms: DiscussionPermissions;
  showHeader: boolean;
  isPinned?: boolean;
  onReplyInThread?: (messageId: number) => void;
  onOptimisticReactionToggle?: (
    messageId: number,
    emoji: string,
    myUserId: number,
    myDisplayName: string
  ) => { wasAdding: boolean };
  onOptimisticPatch?: (
    messageId: number,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  inThread?: boolean;
}
