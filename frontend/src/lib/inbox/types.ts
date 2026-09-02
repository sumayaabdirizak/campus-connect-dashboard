export type InboxRowType = 'group' | 'club' | 'dm';

export type InboxRow = {
  type: InboxRowType;
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  timestamp?: string | null;
  unreadCount?: number;
  avatarUrl?: string | null;
  channelId?: string | null;
  serverId?: string | null;
  groupDmId?: string | null;
};
