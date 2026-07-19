'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { DiscussionMessageMarkdown } from '../../discussion-message-markdown';
import { DiscussionAttachmentCards } from '../../discussion-attachment-cards';
import { DiscussionReactionPillRow } from '../../discussion-message-reactions';
import type { DiscussionMessage } from '../../api/types';
import { avatarGradient, avatarSolid } from '../../utils/avatar-color';
import { DM_QUICK_REACTIONS, formatDmTime } from './dm-message-helpers';

function AvatarCircle({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className='flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full text-[11px] font-bold text-white'
      style={{ background: avatarGradient(name) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function DmMessageBubble({
  message,
  isAuthor,
  isOwner,
  isDeleted,
  isPending,
  myUserId,
  showHeader,
  tickStatus,
  onToggleReaction,
  onStartEdit,
  onDelete,
}: {
  message: DiscussionMessage;
  isAuthor: boolean;
  isOwner: boolean;
  isDeleted: boolean;
  isPending: boolean;
  myUserId: number | null;
  showHeader: boolean;
  tickStatus?: 'seen' | 'sent' | null;
  onToggleReaction: (messageId: number, emoji: string) => void;
  onStartEdit: () => void;
  onDelete: () => void;
}) {
  const senderName = message.sender?.full_name ?? 'Unknown';
  const canDelete = isAuthor || isOwner;

  return (
    <div
      className={cn(
        'group/row flex items-end gap-2 px-4 py-0.5',
        isAuthor ? 'flex-row-reverse' : 'flex-row',
        showHeader && 'mt-3',
        isPending && 'opacity-60'
      )}
    >
      {/* Avatar — only shown for incoming messages */}
      {!isAuthor && (
        <div className='w-8 shrink-0 self-end'>
          {showHeader && <AvatarCircle name={senderName} />}
        </div>
      )}

      {/* Bubble column */}
      <div
        className={cn(
          'flex min-w-0 max-w-[70%] flex-col gap-0.5',
          isAuthor ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender name (only for first message in a group) */}
        {!isAuthor && showHeader && !isDeleted && (
          <span
            className='ml-1 text-[11px] font-semibold leading-none'
            style={{ color: avatarSolid(senderName) }}
          >
            {senderName}
          </span>
        )}

        {/* Bubble + hover toolbar */}
        <div className='relative'>
          {/* Hover reaction/action toolbar */}
          {!isDeleted && !isPending && (
            <div
              className={cn(
                'absolute top-0 z-10 hidden items-center gap-0.5 rounded-full border bg-popover p-0.5 shadow-lg',
                'group-hover/row:flex',
                isAuthor ? 'right-full mr-2' : 'left-full ml-2'
              )}
            >
              {DM_QUICK_REACTIONS.map((emoji) => (
                <Button
                  key={emoji}
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-base'
                  onClick={() => onToggleReaction(message.id, emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
              {isAuthor && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={onStartEdit}
                  aria-label='Edit message'
                >
                  <Icons.edit className='h-3.5 w-3.5' />
                </Button>
              )}
              {canDelete && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-destructive hover:text-destructive'
                  onClick={onDelete}
                  aria-label='Delete message'
                >
                  <Icons.trash className='h-3.5 w-3.5' />
                </Button>
              )}
            </div>
          )}

          <div
            className={cn(
              'comm-bubble-in relative max-w-full px-3 py-2 text-[0.9375rem] leading-relaxed shadow-sm',
              isAuthor
                ? 'rounded-2xl rounded-br-sm bg-[#0066CC] text-white'
                : 'rounded-2xl rounded-bl-sm border border-border/60 bg-card text-card-foreground',
              isDeleted && 'bg-muted text-muted-foreground italic'
            )}
          >
            {isDeleted ? (
              <span className='opacity-60'>This message was deleted.</span>
            ) : (
              <div className='[overflow-wrap:anywhere]'>
                <DiscussionMessageMarkdown text={message.content ?? ''} tone='hybrid' />
              </div>
            )}

            {!isDeleted && message.attachments && message.attachments.length > 0 && (
              <div className='mt-2'>
                <DiscussionAttachmentCards
                  attachments={message.attachments.map((a) => ({
                    id: a.id,
                    fileType: a.fileType,
                    mimeType: a.mimeType,
                    size: a.size,
                    url: a.url,
                    accessUrl: a.accessUrl,
                    isE2EE: a.isE2EE,
                  }))}
                  tone='hybrid'
                />
              </div>
            )}

            {/* Footer: edited + time + ticks */}
            {!isDeleted && (
              <div
                className={cn(
                  'mt-1 flex items-center gap-1 text-[10px] leading-none',
                  isAuthor ? 'justify-end text-white/70' : 'justify-start text-muted-foreground'
                )}
              >
                {message.editedAt && <span>edited</span>}
                <span className='tabular-nums'>{formatDmTime(message.createdAt)}</span>
                {isAuthor &&
                  (isPending ? (
                    <Icons.spinner className='h-3 w-3 animate-spin' />
                  ) : (
                    <Icons.checks
                      className={cn('h-3.5 w-3.5', tickStatus === 'seen' && 'text-[#F4D03F]')}
                      aria-label={tickStatus === 'seen' ? 'Seen' : 'Delivered'}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Reactions below the bubble */}
        {!isDeleted && message.reactions && message.reactions.length > 0 && (
          <div className='mt-0.5'>
            <DiscussionReactionPillRow
              messageId={message.id}
              reactions={message.reactions}
              myUserId={myUserId ?? undefined}
              tone='hybrid'
              onToggle={onToggleReaction}
              showAddPicker={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
