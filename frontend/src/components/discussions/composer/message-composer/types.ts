export const MAX_LINES = 10;

// Same set as the message-reaction picker — keep emoji vocabulary consistent.
export const COMPOSER_EMOJIS = [
  '👍',
  '❤️',
  '😂',
  '🎉',
  '🔥',
  '🙏',
  '✅',
  '📌',
  '🤔',
  '👀',
  '✨',
  '💯'
];

export type PendingAttachment = {
  localId: string;
  file: File;
  progress: number;
  result: import('@/lib/discussions/services/discussion-upload').DiscussionUploadResult | null;
  error: string | null;
  abort: () => void;
};

export type MessageComposerProps = {
  channelId: string;
  channelName?: string;
  channelSlug?: string;
  serverName?: string;
  perms: import('@/lib/discussions/services/use-discussion-permissions').DiscussionPermissions;
  e2eeEnabled?: boolean;
  e2eeKeyVersion?: number;
  /** When set, posts as a reply in this thread root. */
  parentMessageId?: string;
  /** WhatsApp-style quote in the main timeline (not a thread). */
  replyTo?: import('@/lib/discussions/queries/types').DiscussionMessage | null;
  onClearReply?: () => void;
  placeholder?: string;
  myUserId?: number | null;
  myDisplayName?: string | null;
  onOptimisticInsert?: (
    temp: import('@/lib/discussions/queries/types').DiscussionMessage
  ) => void;
  onOptimisticReplace?: (
    tempId: string,
    real: import('@/lib/discussions/queries/types').DiscussionMessage
  ) => void;
  onOptimisticRemove?: (tempId: string) => void;
};
