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
  result: import('@/features/discussions/discussion-upload').DiscussionUploadResult | null;
  error: string | null;
  abort: () => void;
};

export type MessageComposerProps = {
  channelId: number;
  channelName?: string;
  channelSlug?: string;
  serverName?: string;
  perms: import('@/features/discussions/hooks/use-discussion-permissions').DiscussionPermissions;
  e2eeEnabled?: boolean;
  e2eeKeyVersion?: number;
  /** When set, posts as a reply in this thread root. */
  parentMessageId?: number;
  placeholder?: string;
  myUserId?: number | null;
  myDisplayName?: string | null;
  onOptimisticInsert?: (
    temp: import('@/features/discussions/api/types').DiscussionMessage
  ) => void;
  onOptimisticReplace?: (
    tempId: number,
    real: import('@/features/discussions/api/types').DiscussionMessage
  ) => void;
  onOptimisticRemove?: (tempId: number) => void;
};
