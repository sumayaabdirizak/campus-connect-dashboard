'use client';

import { useMemo } from 'react';
import { sanitize as sanitizeHtml } from 'isomorphic-dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Announcement } from '@/lib/announcements/types';
import {
  ANNOUNCEMENT_PURIFY,
  richKind,
} from './announcement-content-helpers';
import { useAnnouncementMarkdownComponents } from './announcement-markdown-components';

interface AnnouncementContentProps {
  announcement: Announcement;
  titleId?: string;
}

export function AnnouncementContent({ announcement, titleId }: AnnouncementContentProps) {
  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }, []);
  const isRtl = locale === 'ar';

  const kind = richKind(announcement);
  const sanitizedHtml = useMemo(() => {
    if (kind !== 'html' || !announcement.bodyHtml) return '';
    return sanitizeHtml(announcement.bodyHtml, ANNOUNCEMENT_PURIFY);
  }, [kind, announcement.bodyHtml]);

  const plainBody = (announcement.content || '').trim();
  const markdownComponents = useAnnouncementMarkdownComponents();

  const renderBody = () => {
    if (kind === 'html' && sanitizedHtml) {
      return (
        <div
          className='announcement-html text-sm leading-relaxed text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_p]:mb-1.5 [&_p]:last:mb-0 [&_ul]:mb-1.5 [&_ol]:mb-1.5'
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }
    if (kind === 'md' && announcement.bodyMarkdown) {
      return (
        <div className='select-text min-w-0'>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {announcement.bodyMarkdown}
          </ReactMarkdown>
        </div>
      );
    }
    return (
      <p className='select-text whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground'>
        {plainBody}
      </p>
    );
  };

  return (
    <div>
      <h3
        id={titleId}
        className='text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base'
      >
        {announcement.title}
      </h3>
      <div className='mt-1.5' dir={isRtl ? 'rtl' : undefined}>
        {renderBody()}
      </div>
    </div>
  );
}
