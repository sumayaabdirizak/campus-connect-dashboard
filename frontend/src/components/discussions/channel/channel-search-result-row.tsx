import { Avatar, AvatarFallback } from '@/features/ui/components/avatar';
import { avatarGradient } from '@/lib/discussions/services/avatar-color';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import {
  formatWhen,
  highlightMatch,
  initialsFor,
  snippet,
} from './channel-search-helpers';

export function SearchResultRow({
  message,
  query,
  showChannel,
  onSelect,
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
