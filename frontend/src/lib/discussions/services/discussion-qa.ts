/**
 * Q&A channel detection (aligned with backend `isDiscussionQaChannelNameKey`).
 * Use server name + channel name + slug as the searchable haystack.
 */
export function isDiscussionQaStyleChannel(
  serverName: string,
  channelName: string,
  channelSlug?: string
): boolean {
  const hay = `${String(serverName || '')} ${String(channelName || '')} ${String(channelSlug || '')}`.toLowerCase();
  return /(?:^|[-_\s])(qa|q&a|q\s*\/\s*a|questions?|help-?desk)(?:$|[-_\s])/i.test(hay);
}

export function hasQaSlashCommand(text: string): boolean {
  return /^\s*\/qa\b/i.test(String(text || ''));
}

export function stripQaSlashCommand(text: string): string {
  return String(text || '').replace(/^\s*\/qa\b\s*/i, '');
}
