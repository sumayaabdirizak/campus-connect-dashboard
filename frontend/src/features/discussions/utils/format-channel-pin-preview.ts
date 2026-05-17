import type { ChannelPin } from '../api/types';
import { getDiscussionMessagePlaintext } from '../decode-web-e2e-ciphertext';

/** Single-line preview for pinned rows (settings Pins tab, pin bar popover). */
export function formatChannelPinPreview(pin: ChannelPin): string {
  const m = pin.message;
  if (m.deletedAt) return '(deleted)';
  const plain = getDiscussionMessagePlaintext({
    content: m.content,
    ciphertext: m.ciphertext,
    messageType: m.messageType
  });
  if (plain && plain.trim().length > 0) {
    return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
  }
  if (m.ciphertext) return '🔒 Encrypted message';
  return '(no text)';
}
