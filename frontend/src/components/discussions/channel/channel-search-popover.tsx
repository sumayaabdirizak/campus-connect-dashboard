'use client';

import { Button } from '@/features/ui/components/button';
import { Icons } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover';
import { ChannelSearchPopoverHeader } from './channel-search-popover-header';
import { ChannelSearchResults } from './channel-search-results';
import { useChannelSearchPopover } from './use-channel-search-popover';

export function ChannelSearchPopover({
  channelId,
  channelName,
  serverId,
  onJump,
  onJumpToChannel
}: {
  channelId: string;
  channelName?: string;
  serverId?: string | null;
  onJump: (messageId: string) => void;
  onJumpToChannel?: (channelId: string, messageId: string) => void;
}) {
  const {
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
    hasMore,
    handleSelect,
  } = useChannelSearchPopover({ channelId, serverId, onJump, onJumpToChannel });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-10 rounded-full text-[#101828] hover:bg-[#F2F4F7]'
          aria-label='Search this channel'
        >
          <Icons.search className='h-5 w-5' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        sideOffset={6}
        className='w-[420px] p-0'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ChannelSearchPopoverHeader
          inputRef={inputRef}
          input={input}
          setInput={setInput}
          scope={scope}
          setScope={setScope}
          canSearchServer={canSearchServer}
          channelName={channelName}
          filters={filters}
          tooShort={tooShort}
        />
        <ChannelSearchResults
          query={query}
          textForApi={textForApi}
          hasFilters={hasFilters}
          canRunSearch={canRunSearch}
          isLoading={isLoading}
          results={results}
          scope={scope}
          hasMore={hasMore}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
