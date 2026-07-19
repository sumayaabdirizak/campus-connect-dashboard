export const SOURCE_LABELS = {
  announcement: 'Announcements',
  discussion: 'Discussions',
  club: 'Clubs',
  sms: 'SMS',
};

export const MODULE_MAP = {
  announcement: 'Announcements',
  discussion: 'Discussions',
  club: 'Clubs',
  sms: 'Notifications',
};

export const DISCUSSION_ACTION_LABELS = {
  CHANNEL_UPDATE: 'Updated channel settings',
  CHANNEL_ARCHIVE: 'Archived channel',
  CHANNEL_UNARCHIVE: 'Restored channel',
  CHANNEL_HARD_DELETE: 'Deleted channel',
  PERMISSION_OVERWRITE_UPSERT: 'Updated permission overwrite',
  PERMISSION_OVERWRITE_DELETE: 'Removed permission overwrite',
  MESSAGE_PIN: 'Pinned message',
  MESSAGE_UNPIN: 'Unpinned message',
  MEMBER_MUTE: 'Muted member',
  MEMBER_UNMUTE: 'Lifted member mute',
  MEMBER_KICK: 'Removed member from server',
};

export const CRITICAL_ACTIONS = new Set([
  'CHANNEL_HARD_DELETE',
  'MEMBER_KICK',
  'REJECT',
  'SUSPEND',
  'FAILED',
]);

export const WARNING_ACTIONS = new Set([
  'CHANNEL_ARCHIVE',
  'MEMBER_MUTE',
  'SKIPPED',
]);

export const ACTOR_SELECT = {
  select: { id: true, full_name: true, email: true, role: { select: { name: true } } },
};
