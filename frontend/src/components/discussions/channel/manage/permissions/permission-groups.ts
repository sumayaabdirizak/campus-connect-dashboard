import { PERMISSION_BITS } from '@/lib/discussions/queries';

type PermBitName = keyof typeof PERMISSION_BITS;

export type PermissionEntry = {
  /** One or more bits toggled together as a single allow/inherit/deny cell. */
  bits: PermBitName[];
  label: string;
};

export type PermissionGroup = {
  id: string;
  label: string;
  entries: PermissionEntry[];
};

/** Compact per-channel permissions (allow / inherit / deny). */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'access',
    label: 'Access',
    entries: [
      { bits: ['VIEW_CHANNEL'], label: 'View channel' },
      { bits: ['READ_MESSAGE_HISTORY'], label: 'Read history' },
    ],
  },
  {
    id: 'chat',
    label: 'Chat',
    entries: [
      {
        bits: [
          'SEND_MESSAGES',
          'ATTACH_FILES',
          'ADD_REACTIONS',
          'CREATE_THREADS',
          'SEND_MESSAGES_IN_THREADS',
        ],
        label: 'Chat',
      },
    ],
  },
  {
    id: 'mod',
    label: 'Moderation',
    entries: [
      { bits: ['MANAGE_MESSAGES'], label: 'Manage messages' },
      { bits: ['PIN_MESSAGES'], label: 'Pin messages' },
      { bits: ['MANAGE_CHANNEL'], label: 'Manage channel' },
      { bits: ['MANAGE_ROLES'], label: 'Manage permissions' },
    ],
  },
];
