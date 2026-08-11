'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChannelSearch, useServerSearch } from '@/lib/discussions/queries/queries';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import { MIN_QUERY, parseSearchInput } from './channel-search-helpers';

export function useChannelSearchPopover({
  channelId,
  serverId,
  onJump,
  onJumpToChannel,
}: {
  channelId: string;
  serverId?: string | null;
  onJump: (messageId: string) => void;
  onJumpToChannel?: (channelId: string, messageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'channel' | 'server'>('channel');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canSearchServer = !!serverId;

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
  const hasFilters = !!(filters.from || filters.has || filters.before || filters.after);
  const tooShort = query.length > 0 && textForApi.length < MIN_QUERY && !hasFilters;
  const canRunSearch = textForApi.length >= MIN_QUERY || hasFilters;

  const handleSelect = (message: DiscussionMessage) => {
    setOpen(false);
    if (scope === 'server' && message.channelId && onJumpToChannel) {
      onJumpToChannel(message.channelId, message.id);
      return;
    }
    onJump(message.id);
  };

  return {
    open,
    setOpen,
    input,
    setInput,
    query,
    scope,
    setScope,
    inputRef,
    canSearchServer,
    filters,
    textForApi,
    results,
    isLoading,
    hasFilters,
    tooShort,
    canRunSearch,
    hasMore: active.data?.hasMore,
    handleSelect,
  };
}
