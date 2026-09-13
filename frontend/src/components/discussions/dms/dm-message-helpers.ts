import { formatMessageClock } from '@/lib/format-time';

export const DM_QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥'];

export function formatDmTime(iso: string): string {
  return formatMessageClock(iso);
}
