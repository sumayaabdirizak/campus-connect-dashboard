'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { avatarGradient } from '../../utils/avatar-color';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useChannelSearch,
  useServerSearch,
  type SearchFilterParams
} from '../../api/queries';
import type { DiscussionMessage } from '../../api/types';

/** Pull `from:foo`, `has:image|file|video|attachment`, `before:`, `after:`
 *  tokens out of the raw input. Returns the leftover free-text plus a
 *  filters object that maps cleanly onto the API's query params. */
function parseSearchInput(raw: string): {
  text: string;
  filters: SearchFilterParams;
} {
  const filters: SearchFilterParams = {};
  let text = raw;
  // Match each token once. Token form: key:value (no spaces in value).
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

function FilterChips({ filters }: { filters: SearchFilterParams }) {
  const items: { label: string; value: string }[] = [];
  if (filters.from) items.push({ label: 'from', value: filters.from });
  if (filters.has) items.push({ label: 'has', value: filters.has });
  if (filters.before) items.push({ label: 'before', value: filters.before });
  if (filters.after) items.push({ label: 'after', value: filters.after });
  if (items.length === 0) return null;
  return (
    <div className='mt-1.5 flex flex-wrap gap-1 px-1'>
      {items.map((it) => (
        <span
          key={it.label}
          className='inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary'
        >
          <span className='opacity-70'>{it.label}:</span>
          <span>{it.value}</span>
        </span>
      ))}
    </div>
  );
}

const MIN_QUERY = 2;

function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? '';
  if (!source) return '?';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Wrap each query-match with a <mark> for visible highlighting. Case-insensitive. */
function highlightMatch(text: string, query: string): React.ReactNode {
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

function snippet(content: string | null | undefined, query: string): string {
  const text = String(content ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '(no text)';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  // Window the snippet around the first match.
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function SearchResultRow({
  message,
  query,
  showChannel,
  onSelect
}: {
  message: DiscussionMessage;
  query: string;
  showChannel: boolean;
  onSelect: () => void;
}) {
  const senderName = message.isAnonymous
    ? 'Anonymous'
    : message.sender?.full_name ?? 'Unknown';
  const text = snippet(message.content, query);
  const channelName = message.channel?.name;
  return (
    <button
      type='button'
      onClick={onSelect}
      className='flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60'
    >
      <Avatar className='h-7 w-7 shrink-0'>
        <AvatarFallback
          className='text-[10px] font-semibold text-white'
          style={{ background: avatarGradient(senderName, message.isAnonymous) }}
        >
          {initialsFor(senderName)}
        </AvatarFallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline gap-2'>
          <span className='truncate text-xs font-semibold'>{senderName}</span>
          {showChannel && channelName && (
            <span className='shrink-0 truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
              #{channelName}
            </span>
          )}
          <span className='ml-auto shrink-0 text-[10px] text-muted-foreground'>
            {formatWhen(message.createdAt)}
          </span>
        </div>
        <p className='mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground'>
          {highlightMatch(text, query)}
        </p>
      </div>
    </button>
  );
}

export function ChannelSearchPopover({
  channelId,
  channelName,
  serverId,
  onJump,
  onJumpToChannel
}: {
  channelId: number;
  channelName?: string;
  /** When provided, the popover offers an "All channels" scope toggle
   *  that searches every channel the caller can read in this server. */
  serverId?: number | null;
  /** Jump within the current channel. */
  onJump: (messageId: number) => void;
  /** Jump to a different channel + message — used by server-scope results. */
  onJumpToChannel?: (channelId: number, messageId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'channel' | 'server'>('channel');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canSearchServer = serverId != null && serverId > 0;

  // Debounce the input → query so we don't fire a search on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(input.trim()), 250);
    return () => window.clearTimeout(t);
  }, [input]);

  // Reset on close so opening again starts fresh.
  useEffect(() => {
    if (!open) {
      setInput('');
      setQuery('');
      setScope('channel');
    } else {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Parse free-text + tokens. The raw `query` from debounced input is split
  // into a text portion (used for content ILIKE) and a filters object (sent
  // as separate query params).
  const parsed = useMemo(() => parseSearchInput(query), [query]);
  const filters = parsed.filters;
  const textForApi = parsed.text;

  const channelHook = useChannelSearch(
    channelId,
    scope === 'channel' ? textForApi : '',
    scope === 'channel' ? filters : undefined
  );
  const serverHook = useServerSearch(
    canSearchServer ? serverId : null,
    scope === 'server' ? textForApi : '',
    scope === 'server' ? filters : undefined
  );
  const active = scope === 'channel' ? channelHook : serverHook;
  const results = useMemo(() => active.data?.results ?? [], [active.data]);
  const isLoading = active.isLoading;
  const hasFilters =
    !!(filters.from || filters.has || filters.before || filters.after);
  const tooShort =
    query.length > 0 && textForApi.length < MIN_QUERY && !hasFilters;
  const canRunSearch = textForApi.length >= MIN_QUERY || hasFilters;

  const handleSelect = (message: DiscussionMessage) => {
    setOpen(false);
    if (scope === 'server' && message.channelId && onJumpToChannel) {
      onJumpToChannel(Number(message.channelId), message.id);
      return;
    }
    onJump(message.id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          aria-label='Search this channel'
        >
          <Icons.search className='h-4 w-4' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        sideOffset={6}
        className='w-[420px] p-0'
        // Don't autofocus the popover — we focus the input manually below.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='border-b p-2'>
          <div className='relative'>
            <Icons.search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                scope === 'server'
                  ? 'Search across all channels…'
                  : channelName
                    ? `Search in #${channelName}`
                    : 'Search messages…'
              }
              className='h-8 pl-7 text-xs'
            />
          </div>

          {canSearchServer && (
            <div className='mt-2 flex gap-1 rounded-md bg-muted/40 p-0.5'>
              <button
                type='button'
                onClick={() => setScope('channel')}
                className={cn(
                  'flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                  scope === 'channel'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {channelName ? `#${channelName}` : 'This channel'}
              </button>
              <button
                type='button'
                onClick={() => setScope('server')}
                className={cn(
                  'flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                  scope === 'server'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All channels
              </button>
            </div>
          )}

          <FilterChips filters={filters} />

          {tooShort && (
            <p className='mt-1 px-1 text-[10px] text-muted-foreground'>
              Type at least {MIN_QUERY} characters, or add a filter (e.g.{' '}
              <code className='font-mono'>from:alice</code>).
            </p>
          )}
        </div>
        <ScrollArea className='max-h-[420px]'>
          {!query && !hasFilters && (
            <div className='space-y-1 px-6 py-8 text-center text-xs text-muted-foreground'>
              <p>Find messages by content.</p>
              <p>
                Try filters:{' '}
                <code className='rounded bg-muted px-1 font-mono'>from:alice</code>
                {' '}
                <code className='rounded bg-muted px-1 font-mono'>has:image</code>
              </p>
            </div>
          )}
          {canRunSearch && isLoading && results.length === 0 && (
            <div className='flex items-center justify-center gap-1 py-8 text-xs text-muted-foreground'>
              <Icons.spinner className='h-3 w-3 animate-spin' />
              Searching…
            </div>
          )}
          {canRunSearch && !isLoading && results.length === 0 && (
            <div className='px-6 py-8 text-center text-xs text-muted-foreground'>
              No matches
              {textForApi ? (
                <>
                  {' '}
                  for <span className='font-medium text-foreground'>“{textForApi}”</span>
                </>
              ) : null}
              .
            </div>
          )}
          {results.length > 0 && (
            <div className='divide-y'>
              {results.map((m) => (
                <SearchResultRow
                  key={m.id}
                  message={m}
                  query={query}
                  showChannel={scope === 'server'}
                  onSelect={() => handleSelect(m)}
                />
              ))}
            </div>
          )}
          {active.data?.hasMore && (
            <div
              className={cn(
                'border-t bg-muted/30 px-3 py-1.5 text-center text-[10px] text-muted-foreground'
              )}
            >
              Refine the query to see more results.
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
