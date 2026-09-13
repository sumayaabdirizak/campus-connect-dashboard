'use client';

import { CornerUpLeft } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { Icons } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover';
import { cn } from '@/lib/utils';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions';
import { MessageMoreMenu } from '@/components/discussions/channel/message-actions-menu';
import { PICKER_EMOJIS, QUICK_REACTIONS } from './format';

interface MessageActionsToolbarProps {
  message: DiscussionMessage;
  channelId: string;
  isAuthor: boolean;
  perms: DiscussionPermissions;
  isPinned: boolean;
  onEdit: () => void;
  onReplyInThread?: (messageId: string) => void;
  onQuoteReply?: (message: DiscussionMessage) => void;
  onQuickReact: (emoji: string) => void;
  onOptimisticPatch?: (
    messageId: string,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  inThread: boolean;
}

export function MessageActionsToolbar({
  message,
  channelId,
  isAuthor,
  perms,
  isPinned,
  onEdit,
  onReplyInThread,
  onQuoteReply,
  onQuickReact,
  onOptimisticPatch,
  inThread
}: MessageActionsToolbarProps) {
  return (
    <div
      data-message-toolbar
      className={cn(
        'pointer-events-none absolute -top-9 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 opacity-0 shadow-lg transition-opacity',
        isAuthor ? 'right-0' : 'left-0',
        'group-hover/row:pointer-events-auto group-hover/row:opacity-100',
        'focus-within:pointer-events-auto focus-within:opacity-100',
        'data-[menu-open=true]:pointer-events-auto data-[menu-open=true]:opacity-100'
      )}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <Button
          key={emoji}
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-base'
          onClick={() => onQuickReact(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            aria-label='Pick reaction'
          >
            <Icons.add className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-64 p-2'>
          <div className='grid grid-cols-8 gap-0.5'>
            {PICKER_EMOJIS.map((em) => (
              <button
                key={em}
                type='button'
                className='flex h-8 items-center justify-center rounded text-lg hover:bg-muted'
                onClick={() => onQuickReact(em)}
              >
                {em}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {onQuoteReply && !inThread ? (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7'
          onClick={() => onQuoteReply(message)}
          aria-label='Reply'
        >
          <CornerUpLeft className='h-4 w-4' />
        </Button>
      ) : null}
      <MessageMoreMenu
        message={message}
        channelId={channelId}
        myUserId={null}
        perms={perms}
        isAuthor={isAuthor}
        isPinned={isPinned}
        inThread={inThread}
        onReply={onReplyInThread ? () => onReplyInThread(message.id) : undefined}
        onQuoteReply={
          onQuoteReply && !inThread ? () => onQuoteReply(message) : undefined
        }
        onReact={onQuickReact}
        onOptimisticPatch={onOptimisticPatch}
        onEdit={onEdit}
        trigger={
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            aria-label='More actions'
          >
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        }
      />
    </div>
  );
}
