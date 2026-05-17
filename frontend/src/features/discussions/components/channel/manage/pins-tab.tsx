'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannelPins, useUnpinMessage } from '../../../api/queries';
import { formatChannelPinPreview } from '../../../utils/format-channel-pin-preview';

export function PinsTab({
  channelId,
  canManagePins,
  onJumpToMessage
}: {
  channelId: number;
  canManagePins: boolean;
  /** Close settings and scroll/highlight the message in the main timeline. */
  onJumpToMessage?: (messageId: number) => void;
}) {
  const { data, isLoading, isError, error, refetch } = useChannelPins(channelId);
  const unpin = useUnpinMessage(channelId);

  const pins = data?.results ?? [];

  if (isLoading) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-16 w-full' />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className='rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm'>
        <p className='font-medium text-destructive'>Couldn&apos;t load pins</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='mt-3'
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-center'>
        <Icons.pin className='h-8 w-8 text-muted-foreground/60' />
        <p className='text-sm font-medium'>No pinned messages</p>
        <p className='max-w-sm px-4 text-xs text-muted-foreground'>
          Pin a message from the message menu (⋯) in this channel. Pins appear
          here and in the bar above the chat.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <p className='text-[11px] text-muted-foreground'>
        {pins.length} pinned message{pins.length === 1 ? '' : 's'}. Jump opens
        the chat view to that message.
      </p>
      <ScrollArea className='max-h-[min(360px,45vh)] rounded-md border'>
        <ul className='divide-y'>
          {pins.map((pin) => (
            <li
              key={pin.id}
              className='group/pin flex items-start gap-2 px-3 py-2.5 hover:bg-muted/40'
            >
              <div className='min-w-0 flex-1 space-y-1'>
                <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs'>
                  <span className='font-medium'>
                    {pin.message.sender?.full_name ?? 'Unknown'}
                  </span>
                  <span className='text-muted-foreground'>
                    pinned {new Date(pin.pinnedAt).toLocaleString()}
                  </span>
                  {pin.pinnedBy?.full_name ? (
                    <span className='text-muted-foreground'>
                      by {pin.pinnedBy.full_name}
                    </span>
                  ) : null}
                </div>
                <p className='line-clamp-3 text-xs leading-snug text-muted-foreground'>
                  {formatChannelPinPreview(pin)}
                </p>
                {onJumpToMessage ? (
                  <Button
                    type='button'
                    variant='link'
                    className='h-auto p-0 text-xs'
                    onClick={() => onJumpToMessage(pin.messageId)}
                  >
                    Go to message
                  </Button>
                ) : null}
              </div>
              {canManagePins ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 shrink-0'
                  aria-label='Unpin message'
                  disabled={unpin.isPending}
                  onClick={() => unpin.mutate(pin.messageId)}
                >
                  <Icons.pinOff className='h-4 w-4' />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
