export type InboxRowType = 'group' | 'club' | 'dm' | 'office';

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
  /** Faculty server id (or self for faculty/club). */
  serverId?: string | null;
  /** Openable text channel (legacy batch/section maps here). */
  channelId?: string | null;
  /** Club page slug when type is club. */
  clubSlug?: string | null;
  /** Office thread status or READY desk badge. */
  badge?: string;
  /** desk = always-listed office; thread = conversation. */
  officeKind?: 'desk' | 'thread';
  /** Support office slug (desk rows + some threads). */
  officeSlug?: string | null;
  /** Set on desk rows — null/undefined = university desk. */
  facultyId?: number | null;
  /** Faculty display name when desk is faculty-scoped. */
  facultyName?: string | null;
}

export interface DirectDmResult {
  groupDm: { id: number };
  created: boolean;
}

export interface InboxResponse {
  [key: string]: InboxRow[] | InboxRow | any;
}
