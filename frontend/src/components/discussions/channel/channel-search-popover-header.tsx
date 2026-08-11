'use client';

import type { RefObject } from 'react';
import { Icons } from '@/components/icons';
import { Input } from '@/features/ui/components/input';
import { cn } from '@/lib/utils';
import type { SearchFilterParams } from '@/lib/discussions/queries/queries';
import { FilterChips } from './channel-search-filter-chips';
import { MIN_QUERY } from './channel-search-helpers';

export function ChannelSearchPopoverHeader({
  inputRef,
  input,
  setInput,
  scope,
  setScope,
  canSearchServer,
  channelName,
  filters,
  tooShort,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  input: string;
  setInput: (v: string) => void;
  scope: 'channel' | 'server';
  setScope: (v: 'channel' | 'server') => void;
  canSearchServer: boolean;
  channelName?: string;
  filters: SearchFilterParams;
  tooShort: boolean;
}) {
  return (
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
  );
}
