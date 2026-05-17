'use client';

import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannel, useChannelMembers } from '../../api/queries';
import { useDiscussionPermissions } from '../../hooks/use-discussion-permissions';
import { useChannelMessages } from '../../hooks/use-channel-messages';

/**
 * Placeholder right pane used during Phase 2 of the discussions rewrite.
 * Renders a real channel header + member count + a sample of recent messages
 * so the layout shell can be reviewed end-to-end. Phase 3 replaces this with
 * the full message-list + composer experience.
 */
export function ChannelPanePlaceholder({ channelId }: { channelId: number | null }) {
  const { data: channelData, isLoading } = useChannel(channelId);
  const { data: memberData } = useChannelMembers(channelId);
  const perms = useDiscussionPermissions(channelData?.myPermissions);
  const { messages, isLoading: messagesLoading } = useChannelMessages(channelId);

  if (channelId == null) {
    return (
      <div className='flex h-full flex-1 flex-col items-center justify-center gap-2 text-muted-foreground'>
        <Icons.chat className='h-8 w-8 opacity-60' />
        <p className='text-sm'>Select a channel to start reading</p>
      </div>
    );
  }

  return (
    <div className='flex h-full flex-1 flex-col'>
      <header className='flex h-12 shrink-0 items-center gap-3 border-b px-4'>
        <Icons.hash className='h-4 w-4 text-muted-foreground' />
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-semibold'>
            {isLoading ? <Skeleton className='h-4 w-32' /> : channelData?.channel?.name}
          </div>
          {channelData?.channel?.topic ? (
            <div className='truncate text-xs text-muted-foreground'>
              {channelData.channel.topic}
            </div>
          ) : null}
        </div>
        {memberData?.results ? (
          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
            <Icons.teams className='h-3 w-3' />
            {memberData.results.length}
          </div>
        ) : null}
      </header>

      <div className='flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4'>
        {messagesLoading && messages.length === 0 ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-2/3' />
            <Skeleton className='h-12 w-3/4' />
            <Skeleton className='h-12 w-1/2' />
          </div>
        ) : messages.length === 0 ? (
          <div className='m-auto flex max-w-md flex-col items-center gap-2 text-center text-muted-foreground'>
            <Icons.hash className='h-10 w-10 opacity-60' />
            <p className='text-sm'>This is the beginning of #{channelData?.channel?.name}</p>
            {channelData?.channel?.topic ? (
              <p className='text-xs'>{channelData.channel.topic}</p>
            ) : null}
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className='flex flex-col gap-0.5'>
              <div className='text-xs text-muted-foreground'>
                {m.isAnonymous ? 'Anonymous' : m.sender?.full_name ?? 'Unknown'}
                <span className='ml-2 opacity-60'>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className='whitespace-pre-wrap break-words text-sm'>
                {m.deletedAt ? (
                  <span className='italic text-muted-foreground'>(deleted)</span>
                ) : (
                  m.content || (m.ciphertext ? '🔒 encrypted' : '')
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <footer className='flex h-14 shrink-0 items-center border-t bg-muted/30 px-4 text-xs text-muted-foreground'>
        {perms.canSend
          ? 'Composer lands in Phase 3.'
          : 'You don’t have permission to send messages here.'}
      </footer>
    </div>
  );
}
