import type { Announcement } from '@/lib/announcements/types';

export const ANNOUNCEMENT_PURIFY = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'blockquote',
    'code',
    'pre',
    'span',
    'div',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'rel', 'target', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false,
};

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function richKind(announcement: Announcement): 'html' | 'md' | null {
  if (announcement.bodyHtml?.trim()) return 'html';
  if (announcement.bodyMarkdown?.trim()) return 'md';
  return null;
}

export function approximatePlainLength(announcement: Announcement): number {
  const kind = richKind(announcement);
  const plain = (announcement.content || '').trim();
  if (kind === 'html' && announcement.bodyHtml) return stripTags(announcement.bodyHtml).length;
  if (kind === 'md' && announcement.bodyMarkdown) return announcement.bodyMarkdown.trim().length;
  return plain.length;
}

export function getAnnouncementContentI18n(locale: string) {
  return locale === 'ar'
    ? {
        pinned: 'نشِط',
        readMore: 'قراءة المزيد',
        showLess: 'عرض أقل',
        roles: 'الأدوار',
        scope: 'النطاق',
        published: 'النشر',
      }
    : {
        pinned: 'Active',
        readMore: 'Read more',
        showLess: 'Show less',
        roles: 'Roles',
        scope: 'Scope',
        published: 'Published',
      };
}
