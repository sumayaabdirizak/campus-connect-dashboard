import type { ChatAttachment } from '@/lib/course-details/types';

/** Legacy auto-caption when sharing files without a message. */
const SHARED_FILES_RE = /^Shared \d+ files?$/i;

export function isSharedFilesPlaceholder(content: string): boolean {
  return SHARED_FILES_RE.test(content.trim());
}

export function shouldShowMessageText(
  content: string,
  attachmentCount: number,
  pendingCount = 0
): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (isSharedFilesPlaceholder(trimmed) && attachmentCount + pendingCount > 0) return false;
  return true;
}

export type ChatFileKind = 'image' | 'pdf' | 'video' | 'audio' | 'file';

export function chatFileKind(name: string, mimeType: string | null): ChatFileKind {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  const lower = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lower)) return 'image';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (/\.(mp4|webm|mov)$/i.test(lower)) return 'video';
  if (/\.(mp3|wav|ogg)$/i.test(lower)) return 'audio';
  return 'file';
}

export function chatFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return 'FILE';
  return name.slice(dot + 1).toUpperCase().slice(0, 8);
}

export type DisplayChatFile = {
  id: string;
  name: string;
  url?: string;
  size: number | null;
  mimeType: string | null;
  pending?: boolean;
  previewUrl?: string;
};

export function attachmentToDisplayFile(a: ChatAttachment): DisplayChatFile {
  return {
    id: String(a.id),
    name: a.name,
    url: a.url,
    size: a.size,
    mimeType: a.mimeType
  };
}
