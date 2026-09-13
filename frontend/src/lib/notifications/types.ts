// Notification feed types
export type NotifSource = 'announcement' | 'assignment' | 'quiz' | 'discussion' | 'course';

export interface NotifItem {
  key: string;
  source: NotifSource;
  type: string;
  title: string;
  subtitle: string;
  body: string;
  at: string;
  href: string;
  read: boolean;
  serverId?: number;
}

export interface DeadlineRow {
  kind: 'announcement' | 'assignment' | 'quiz';
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

export const NOTIFICATION_DAY_MS = 24 * 60 * 60 * 1000;

// Discussion notification types (from lib/discussions)
export type DiscussionNotificationType = 'MESSAGE' | 'MENTION' | 'REACTION' | 'PIN' | string;

export type DiscussionNotification = {
  id: number;
  userId: number;
  groupId: string | null;
  messageId: string | null;
  type: DiscussionNotificationType;
  payload: {
    groupId?: string;
    channelId?: string;
    channelSlug?: string;
    messageId?: string;
    threadRootMessageId?: string;
    senderId?: number;
    senderName?: string;
    groupDmId?: string;
    pinnedById?: number;
    pinnedByName?: string;
    reactorId?: number;
    reactorName?: string;
    emoji?: string;
    [k: string]: unknown;
  } | null;
  readAt?: string | null;
  createdAt: string;
  display?: {
    channelSlug: string | null;
    channelHash: string | null;
    channelName: string | null;
    groupLabel: string | null;
    snippet: string | null;
    messageSenderName: string | null;
  };
};

export type NotificationsListResponse = {
  results: DiscussionNotification[];
};

export type MarkReadPayload = {
  notificationIds?: number[];
  groupId?: string;
  groupDmId?: string;
  upToCreatedAt?: string;
  markAll?: boolean;
};

export type UnreadCountResponse = {
  unreadCount: number;
};

export type UnreadSocketPayload = {
  globalUnread: number;
  byGroup: Array<{ groupId: string; unreadCount: number }>;
  byGroupDm: Array<{ groupDmId: string; unreadCount: number }>;
};
