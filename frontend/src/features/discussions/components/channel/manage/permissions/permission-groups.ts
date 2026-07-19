import { PERMISSION_BITS } from '../../../../api/types';

type PermBitName = keyof typeof PERMISSION_BITS;

export type PermissionEntry = {
  bit: PermBitName;
  label: string;
  description: string;
};

export type PermissionGroup = {
  id: string;
  label: string;
  entries: PermissionEntry[];
};

/// Only bits that are meaningfully *per-channel* are surfaced here.
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'general',
    label: 'General',
    entries: [
      {
        bit: 'VIEW_CHANNEL',
        label: 'View channel',
        description: 'See this channel in the sidebar and load its messages.'
      },
      {
        bit: 'READ_MESSAGE_HISTORY',
        label: 'Read message history',
        description: 'Scroll back through messages posted before joining.'
      }
    ]
  },
  {
    id: 'messages',
    label: 'Messages',
    entries: [
      {
        bit: 'SEND_MESSAGES',
        label: 'Send messages',
        description: 'Post new messages in this channel.'
      },
      {
        bit: 'ATTACH_FILES',
        label: 'Attach files',
        description: 'Upload images, documents, and other attachments.'
      },
      {
        bit: 'EMBED_LINKS',
        label: 'Embed links',
        description: 'Expand URLs into rich previews.'
      },
      {
        bit: 'ADD_REACTIONS',
        label: 'Add reactions',
        description: 'React to messages with emoji.'
      },
      {
        bit: 'USE_EXTERNAL_EMOJI',
        label: 'Use external emoji',
        description: 'Send emoji from other servers.'
      },
      {
        bit: 'MENTION_EVERYONE',
        label: 'Mention @everyone',
        description: 'Ping everyone with VIEW_CHANNEL.'
      }
    ]
  },
  {
    id: 'threads',
    label: 'Threads',
    entries: [
      {
        bit: 'CREATE_THREADS',
        label: 'Create threads',
        description: 'Start a threaded conversation on a message.'
      },
      {
        bit: 'SEND_MESSAGES_IN_THREADS',
        label: 'Reply in threads',
        description: 'Post inside an open thread.'
      },
      {
        bit: 'MANAGE_THREADS',
        label: 'Manage threads',
        description: 'Lock, archive, and rename threads.'
      }
    ]
  },
  {
    id: 'moderation',
    label: 'Moderation',
    entries: [
      {
        bit: 'MANAGE_MESSAGES',
        label: 'Manage messages',
        description: "Delete other members' messages and accept answers."
      },
      {
        bit: 'PIN_MESSAGES',
        label: 'Pin messages',
        description: 'Pin or unpin messages in this channel.'
      },
      {
        bit: 'MANAGE_CHANNEL',
        label: 'Manage channel',
        description: 'Edit settings, archive, rename, or move this channel.'
      },
      {
        bit: 'MANAGE_ROLES',
        label: 'Manage permissions',
        description: 'Edit this overwrite list. Grant carefully.'
      }
    ]
  }
];
