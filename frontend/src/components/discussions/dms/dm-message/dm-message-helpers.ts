import { formatMessageClock } from '@/lib/format-time';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥'];

export function formatTime(iso: string): string {
  return formatMessageClock(iso);
}
