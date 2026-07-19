import { Icons } from '@/components/icons';
import {
  PERMISSION_BITS,
  type DiscussionChannelKind
} from '../../../../api/types';

export const TOPIC_MAX = 1024;
export const NAME_MAX = 64;
export const UNCATEGORIZED = '__uncategorized__';

export const LOCK_DENY_BITS =
  PERMISSION_BITS.SEND_MESSAGES |
  PERMISSION_BITS.CREATE_THREADS |
  PERMISSION_BITS.ADD_REACTIONS;

export function toBigIntMask(s: string | undefined | null): bigint {
  if (!s) return BigInt(0);
  try {
    return BigInt(s);
  } catch {
    return BigInt(0);
  }
}

export const KIND_OPTIONS: Array<{
  value: DiscussionChannelKind;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'TEXT',
    label: 'Text',
    description: 'Free-form discussion. Everyone with access can post and reply.',
    Icon: Icons.hash
  },
  {
    value: 'ANNOUNCEMENT',
    label: 'Announcement',
    description:
      'Only members with Send Messages can post. Best for read-mostly channels.',
    Icon: Icons.speakerphone
  },
  {
    value: 'FORUM',
    label: 'Forum',
    description:
      'Questions and threads with answers. Mirrors the Campuswire Q&A surface.',
    Icon: Icons.chat ?? Icons.hash
  }
];
