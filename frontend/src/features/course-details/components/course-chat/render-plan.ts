import type { ChatMessage } from '../../api/chat-types';
import { dayLabel } from './chat-utils';

export type ChatRenderItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'unread'; key: string }
  | { kind: 'message'; key: string; message: ChatMessage };

/** Interleave day dividers and an optional unread separator into the list. */
export function buildRenderPlan(
  messages: ChatMessage[],
  firstUnreadId: number | null
): ChatRenderItem[] {
  const plan: ChatRenderItem[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const day = new Date(message.created_at).toDateString();
    if (day !== lastDay) {
      plan.push({ kind: 'day', key: `day-${day}`, label: dayLabel(message.created_at) });
      lastDay = day;
    }
    if (firstUnreadId != null && message.id === firstUnreadId) {
      plan.push({ kind: 'unread', key: 'unread-divider' });
    }
    plan.push({ kind: 'message', key: `m-${message.id}`, message });
  }
  return plan;
}
