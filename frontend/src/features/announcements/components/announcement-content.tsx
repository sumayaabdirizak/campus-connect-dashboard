'use client';

import { useMemo, useState } from 'react';
import { sanitize as sanitizeHtml } from 'isomorphic-dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Announcement } from '../api/types';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { isAnnouncementTimelyPinned } from '../utils/announcementPin';
import {
  ANNOUNCEMENT_PURIFY,
  approximatePlainLength,
  getAnnouncementContentI18n,
  richKind,
} from './announcement-content-helpers';
import { useAnnouncementMarkdownComponents } from './announcement-markdown-components';

interface AnnouncementContentProps {
  announcement: Announcement;
  showTargetingDetails?: boolean;
  titleId?: string;
}

export function AnnouncementContent({
  announcement,
  showTargetingDetails = false,
  titleId,
}: AnnouncementContentProps) {
  const [expanded, setExpanded] = useState(false);
  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }, []);
  const isRtl = locale === 'ar';
  const i18n = getAnnouncementContentI18n(locale);

  const kind = richKind(announcement);
  const sanitizedHtml = useMemo(() => {
    if (kind !== 'html' || !announcement.bodyHtml) return '';
    return sanitizeHtml(announcement.bodyHtml, ANNOUNCEMENT_PURIFY);
  }, [kind, announcement.bodyHtml]);

  const plainBody = (announcement.content || '').trim();
  const len = approximatePlainLength(announcement);
  const needsTruncate = len > (kind ? 280 : 150);
  const clampClass = !expanded && needsTruncate ? 'line-clamp-4 max-h-[7.5rem]' : '';
  const markdownComponents = useAnnouncementMarkdownComponents();

  const roles = (announcement.targetRoles ?? []).join(', ') || '-';
  const scope = announcement.targetType ?? '-';
  const publishedValue = announcement.publishedAt || announcement.createdAt;
  const publishedAt = publishedValue ? new Date(publishedValue).toLocaleString() : '-';

  const renderBody = () => {
    if (kind === 'html' && sanitizedHtml) {
      return (
        <div
          className={cn(
            'announcement-html text-[15px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:mb-2 [&_ol]:mb-2',
            clampClass
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }
    if (kind === 'md' && announcement.bodyMarkdown) {
      return (
        <div className={cn('select-text min-w-0', clampClass)}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {announcement.bodyMarkdown}
          </ReactMarkdown>
        </div>
      );
    }
    const preview =
      !expanded && needsTruncate && plainBody.length > 150 ? `${plainBody.slice(0, 150)}…` : plainBody;
    return (
      <p className={cn('select-text text-[15px] leading-relaxed text-muted-foreground', clampClass)}>
        {preview}
      </p>
    );
  };

  return (
    <div className='mt-1.5'>
      {isAnnouncementTimelyPinned(announcement) && (
        <p className='mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
          <Icons.pin className='size-3 shrink-0' aria-hidden />
          {i18n.pinned}
        </p>
      )}
      <h3
        id={titleId}
        className='text-[15px] font-semibold leading-snug tracking-tight text-foreground md:text-[16px]'
      >
        {announcement.title}
      </h3>
      <div className='mt-1.5' dir={isRtl ? 'rtl' : undefined}>
        {renderBody()}
      </div>
      {needsTruncate && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          aria-expanded={expanded}
          className='mt-1 min-h-[24px] text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        >
          {expanded ? i18n.showLess : i18n.readMore}
        </button>
      )}
      {showTargetingDetails && (
        <div className='mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-3'>
          <span>
            <strong className='text-foreground'>{i18n.roles}:</strong> {roles}
          </span>
          <span>
            <strong className='text-foreground'>{i18n.scope}:</strong> {scope}
          </span>
          <span>
            <strong className='text-foreground'>{i18n.published}:</strong> {publishedAt}
          </span>
        </div>
      )}
    </div>
  );
}
