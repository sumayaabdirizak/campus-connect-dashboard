'use client';

import React, { useMemo, useState } from 'react';
import { sanitize as sanitizeHtml } from 'isomorphic-dompurify';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Announcement } from '../api/types';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { isAnnouncementTimelyPinned } from '../utils/announcementPin';

interface AnnouncementContentProps {
  announcement: Announcement;
  /** Dean / Super Admin: show targeting + publish metadata. Hidden for students & lecturers. */
  showTargetingDetails?: boolean;
  /** Title element id — used by parent <article aria-labelledby> for the ARIA Feed pattern. */
  titleId?: string;
}

const PURIFY = {
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
    'td'
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'rel', 'target', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function richKind(announcement: Announcement): 'html' | 'md' | null {
  if (announcement.bodyHtml?.trim()) return 'html';
  if (announcement.bodyMarkdown?.trim()) return 'md';
  return null;
}

function approximatePlainLength(announcement: Announcement): number {
  const kind = richKind(announcement);
  const plain = (announcement.content || '').trim();
  if (kind === 'html' && announcement.bodyHtml) return stripTags(announcement.bodyHtml).length;
  if (kind === 'md' && announcement.bodyMarkdown) return announcement.bodyMarkdown.trim().length;
  return plain.length;
}

export function AnnouncementContent({
  announcement,
  showTargetingDetails = false,
  titleId
}: AnnouncementContentProps) {
  const [expanded, setExpanded] = useState(false);
  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }, []);
  const isRtl = locale === 'ar';
  const i18n =
    locale === 'ar'
      ? {
          pinned: 'نشِط',
          readMore: 'قراءة المزيد',
          showLess: 'عرض أقل',
          roles: 'الأدوار',
          scope: 'النطاق',
          published: 'النشر'
        }
      : {
          pinned: 'Active',
          readMore: 'Read more',
          showLess: 'Show less',
          roles: 'Roles',
          scope: 'Scope',
          published: 'Published'
        };

  const kind = richKind(announcement);
  const sanitizedHtml = useMemo(() => {
    if (kind !== 'html' || !announcement.bodyHtml) return '';
    return sanitizeHtml(announcement.bodyHtml, PURIFY);
  }, [kind, announcement.bodyHtml]);

  const plainBody = (announcement.content || '').trim();
  const len = approximatePlainLength(announcement);
  const needsTruncate = len > (kind ? 280 : 150);

  const roles = (announcement.targetRoles ?? []).join(', ') || '-';
  const scope = announcement.targetType ?? '-';
  const publishedValue = announcement.publishedAt || announcement.createdAt;
  const publishedAt = publishedValue ? new Date(publishedValue).toLocaleString() : '-';

  const clampClass = !expanded && needsTruncate ? 'line-clamp-4 max-h-[7.5rem]' : '';

  const markdownComponents = useMemo(
    () =>
      ({
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className='mb-2 text-[15px] leading-relaxed text-muted-foreground last:mb-0'>{children}</p>
      ),
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className='mb-2 text-lg font-semibold text-foreground'>{children}</h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className='mb-2 text-base font-semibold text-foreground'>{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className='mb-1.5 text-[15px] font-semibold text-foreground'>{children}</h3>
      ),
      h4: ({ children }: { children?: React.ReactNode }) => (
        <h4 className='mb-1.5 text-sm font-semibold text-foreground'>{children}</h4>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className='mb-2 list-inside list-disc space-y-1 text-[15px] text-muted-foreground'>{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className='mb-2 list-inside list-decimal space-y-1 text-[15px] text-muted-foreground'>{children}</ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => <li className='leading-relaxed'>{children}</li>,
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a
          href={href}
          className='font-medium text-primary underline-offset-4 hover:underline'
          target='_blank'
          rel='noreferrer noopener'
        >
          {children}
        </a>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className='mb-2 border-s-2 border-primary/40 ps-3 text-sm italic text-muted-foreground'>
          {children}
        </blockquote>
      ),
      code: ({
        className,
        children,
        inline
      }: {
        className?: string;
        children?: React.ReactNode;
        inline?: boolean;
      }) =>
        inline ? (
          <code className='rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground'>{children}</code>
        ) : (
          <code
            className={cn(
              'block overflow-x-auto rounded-md border border-border bg-muted/80 p-3 font-mono text-xs text-foreground',
              className
            )}
          >
            {children}
          </code>
        ),
      pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className='mb-2 overflow-x-auto rounded-md border border-border bg-muted/80 p-3 text-xs'>{children}</pre>
      ),
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className='mb-2 w-full overflow-x-auto'>
          <table className='w-full border-collapse border border-border text-left text-sm text-muted-foreground'>
            {children}
          </table>
        </div>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className='border border-border bg-muted/50 px-2 py-1.5 font-medium text-foreground'>{children}</th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className='border border-border px-2 py-1.5'>{children}</td>
      )
      }) satisfies Partial<Components>,
    []
  );

  const renderBody = () => {
    if (kind === 'html' && sanitizedHtml) {
      return (
        <div
          className={cn(
            'announcement-html text-[15px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:mb-2 [&_ol]:mb-2',
            clampClass
          )}
          // Safe: sanitized with DOMPurify before render
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
      <div
        className='mt-1.5'
        dir={isRtl ? 'rtl' : undefined}
      >
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
