import { formatMessageClock } from '@/lib/format-time';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥'] as const;

export const PICKER_EMOJIS = [
  '👍',
  '❤️',
  '😂',
  '🎉',
  '🔥',
  '🙏',
  '✅',
  '📌',
  '🤔',
  '👀',
  '✨',
  '💯',
  '🚀',
  '👏',
  '😢',
  '😡'
] as const;

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatTime(iso: string): string {
  return formatMessageClock(iso);
}
