import {
  PERMISSION_BITS,
  type DiscussionChannelKind,
} from '@/lib/discussions/queries';

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
}> = [
  { value: 'TEXT', label: 'Text' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'FORUM', label: 'Forum' },
];
