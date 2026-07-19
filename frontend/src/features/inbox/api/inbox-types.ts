export type InboxRowType = 'group' | 'dm' | 'office';

export interface InboxRow {
  type: InboxRowType;
  key: string;
  id: number;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  preview: string;
  timestamp: string | null;
  unreadCount: number;
  href: string;
  /** Office thread status (office rows only). */
  badge?: string;
}

export interface InboxResponse {
  rows: InboxRow[];
  totalUnread: number;
}
