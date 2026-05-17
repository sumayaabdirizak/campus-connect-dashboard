/**
 * Inverse of `btoa(unescape(encodeURIComponent(text)))` used when posting discussion
 * messages from the web client with an E2E-shaped payload while `content` is null.
 * Returns null if the value is missing or not valid base64 / UTF-8 (e.g. real binary ciphertext).
 */
export function decodeWebDefaultDiscussionCiphertext(
  ciphertext: string | null | undefined
): string | null {
  if (ciphertext == null || typeof ciphertext !== 'string') return null;
  const trimmed = ciphertext.trim();
  if (!trimmed) return null;
  try {
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export type DiscussionBodyFields = {
  content?: string | null;
  ciphertext?: string | null;
  messageType?: string;
};

/** Plaintext for display: explicit `content`, else decoded web-default ciphertext. */
export function getDiscussionMessagePlaintext(msg: DiscussionBodyFields): string | null {
  if (msg.content != null && msg.content !== '') return msg.content;
  const decoded = decodeWebDefaultDiscussionCiphertext(msg.ciphertext);
  if (decoded != null && decoded !== '') return decoded;
  return null;
}

/** User-facing line including placeholders when nothing can be shown. */
export function formatDiscussionMessageBody(msg: DiscussionBodyFields): string {
  const plain = getDiscussionMessagePlaintext(msg);
  if (plain != null && plain !== '') return plain;
  if (msg.messageType === 'MEDIA') return '[Encrypted/media message]';
  return '[Encrypted message]';
}
