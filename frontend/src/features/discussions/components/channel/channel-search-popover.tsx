'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  useChannelSearch,
  useServerSearch,
} from '../../api/queries';
import type { DiscussionMessage } from '../../api/types';
import { FilterChips } from './channel-search-filter-chips';
import { MIN_QUERY, parseSearchInput } from './channel-search-helpers';
import { ChannelSearchResults } from './channel-search-results';

export function ChannelSearchPopover({
  channelId,
  channelName,
  serverId,
  onJump,
  onJumpToChannel
}: {
  channelId: number;
  channelName?: string;
  serverId?: number | null;
  onJump: (messageId: number) => void;
  onJumpToChannel?: (channelId: number, messageId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'channel' | 'server'>('channel');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canSearchServer = serverId != null && serverId > 0;

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(input.trim()), 250);
    return () => window.clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (!open) {
      setInput('');
      setQuery('');
      setScope('channel');
    } else {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

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
        <ChannelSearchResults
          query={query}
          textForApi={textForApi}
          hasFilters={hasFilters}
          canRunSearch={canRunSearch}
          isLoading={isLoading}
          results={results}
          scope={scope}
          hasMore={active.data?.hasMore}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
