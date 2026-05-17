'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChannelPins, useUnpinMessage } from '../../api/queries';
import { formatChannelPinPreview } from '../../utils/format-channel-pin-preview';

export function PinnedStrip({
  channelId,
  canManagePins,
  onJump
}: {
  channelId: number;
  canManagePins: boolean;
  onJump?: (messageId: number) => void;
}) {
  const { data, isLoading } = useChannelPins(channelId);
  const unpin = useUnpinMessage(channelId);
  const [open, setOpen] = useState(false);

  const pins = data?.results ?? [];
  if (isLoading || pins.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            'flex w-full items-center gap-2 border-b bg-amber-500/5 px-4 py-1.5 text-left text-xs',
            'transition-colors hover:bg-amber-500/10'
          )}
          aria-label={`${pins.length} pinned message${pins.length === 1 ? '' : 's'}`}
        >
          <Icons.pin className='h-3.5 w-3.5 text-amber-600 dark:text-amber-400' />
          <span className='font-medium'>{pins.length} pinned</span>
          <span className='truncate text-muted-foreground'>
            · {formatChannelPinPreview(pins[0])}
          </span>
          <Icons.chevronDown
            className={cn(
              'ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[420px] p-0'
        align='start'
        sideOffset={4}
      >
        <div className='flex items-center justify-between border-b px-3 py-2'>
          <span className='text-sm font-semibold'>Pinned messages</span>
          <span className='text-xs text-muted-foreground'>{pins.length}</span>
        </div>
        <ScrollArea className='max-h-80'>
          <ul className='divide-y'>
            {pins.map((pin) => (
              <li
                key={pin.id}
                className='group/pin flex items-start gap-2 px-3 py-2 hover:bg-muted/50'
              >
                <button
                  type='button'
                  className='min-w-0 flex-1 text-left'
                  onClick={() => {
                    setOpen(false);
                    onJump?.(pin.messageId);
                  }}
                >
                  <div className='truncate text-xs font-medium'>
                    {pin.message.sender?.full_name ?? 'Unknown'}
                    <span className='ml-2 font-normal text-muted-foreground'>
                      {new Date(pin.pinnedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>
                    {formatChannelPinPreview(pin)}
                  </div>
                </button>
                {canManagePins && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 opacity-0 transition-opacity group-hover/pin:opacity-100'
                    aria-label='Unpin message'
                    onClick={() => unpin.mutate(pin.messageId)}
                  >
                    <Icons.pinOff className='h-3.5 w-3.5' />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
