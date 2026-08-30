import type { ReactNode } from 'react';
import type { SearchFilterParams } from '@/lib/discussions/queries/queries';

/** Pull `from:foo`, `has:image|file|video|attachment`, `before:`, `after:`
 *  tokens out of the raw input. Returns the leftover free-text plus a
 *  filters object that maps cleanly onto the API's query params. */
export function parseSearchInput(raw: string): {
  text: string;
  filters: SearchFilterParams;
} {
  const filters: SearchFilterParams = {};
  let text = raw;
  const tokenRe = /(?:^|\s)(from|has|before|after):([^\s]+)/gi;
  text = text.replace(tokenRe, (match, key: string, value: string) => {
    const k = key.toLowerCase();
    if (k === 'from') filters.from = value;
    else if (k === 'has') {
      const v = value.toLowerCase();
      if (v === 'image' || v === 'video' || v === 'file' || v === 'attachment') {
        filters.has = v;
      }
    } else if (k === 'before') filters.before = value;
    else if (k === 'after') filters.after = value;
    void match;
    return ' ';
  });
  return { text: text.trim().replace(/\s+/g, ' '), filters };
}

export const MIN_QUERY = 2;

export function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? '';
  if (!source) return '?';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

import { formatMessageWhen } from '@/lib/format-time';

export function formatWhen(iso: string): string {
  return formatMessageWhen(iso);
}

/** Wrap each query-match with a <mark> for visible highlighting. Case-insensitive. */
export function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className='rounded-sm bg-amber-500/30 px-0.5 text-foreground'>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function snippet(content: string | null | undefined, query: string): string {
  const text = String(content ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '(no text)';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}
