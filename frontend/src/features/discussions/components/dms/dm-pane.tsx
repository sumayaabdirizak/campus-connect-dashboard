'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { confirmAction, handleApiError, showToast } from '@/lib/notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/auth-store';
import {
  useGroupDm,
  useLeaveGroupDm,
  useMarkNotificationsRead
} from '../../api/queries';
import { useGroupDmMessages } from '../../hooks/use-group-dm-messages';
import { useGroupDmTyping } from '../../hooks/use-channel-typing';
import { useDmReadReceipts } from '../../hooks/use-dm-read-receipts';
import { emitMessageRead } from '../../api/socket';
import { DmMessageList } from './dm-message-list';
import { DmComposer } from './dm-composer';
import { NotificationsBell } from '../notifications/notifications-panel';
import { TypingIndicator } from '../channel/typing-indicator';

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function dmDisplayName(
  detail: { name?: string | null; members: Array<{ user: { full_name: string } | null }> } | null,
  myUserId: number | null
): string {
  if (!detail) return '';
  if (detail.name && detail.name.trim().length > 0) return detail.name.trim();
  const others = detail.members
    .filter((m) => Number((m as { userId?: number }).userId) !== myUserId)
    .map((m) => m.user?.full_name)
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
  if (others.length === 0) return 'Direct message';
  return others.slice(0, 3).join(', ') + (others.length > 3 ? ` +${others.length - 3}` : '');
}

export function DmPane({ groupDmId }: { groupDmId: number | null }) {
  const router = useRouter();
  const myUser = useAuthStore((s) => s.user);
  const myUserId = myUser?.id != null ? Number(myUser.id) : null;
  const { data, isLoading, error } = useGroupDm(groupDmId);

  const detail = data?.groupDm ?? null;
  const myRole = data?.myRole;
  const isOwner = myRole === 'OWNER';
  const myMember = detail?.members?.find((m) => Number(m.userId) === myUserId) ?? null;
  const canPost = !!myMember?.canPost;
  const myDisplayName = myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null;
  const memberCountForLeave = detail?.members?.length ?? 0;

  // B2 — self-leave. Owner-aware confirm copy, navigate away on success.
  const leaveMut = useLeaveGroupDm(groupDmId ?? 0);
  const handleLeave = async () => {
    if (groupDmId == null || leaveMut.isPending) return;
    const willArchive = memberCountForLeave <= 1;
    const message = willArchive
      ? 'You are the last member. Leaving will archive this conversation.'
      : isOwner
        ? 'Leave this conversation? Ownership will pass to the oldest remaining member.'
        : 'Leave this conversation? You will no longer see new messages here.';
    if (
      !(await confirmAction(
        willArchive ? 'Archive conversation?' : 'Leave conversation?',
        message,
        willArchive ? 'Archive & leave' : 'Leave',
        { icon: 'warning', danger: willArchive }
      ))
    ) {
      return;
    }
    leaveMut.mutate(undefined, {
      onSuccess: (res) => {
        showToast(
          'success',
          res.archived
            ? 'Conversation archived'
            : res.newOwnerId
              ? 'You left. Ownership transferred.'
              : 'You left the conversation'
        );
        router.push('/dashboard/chat/dm');
      },
      onError: (err: unknown) => {
        handleApiError(err, 'Failed to leave conversation');
      }
    });
  };

  // Lifted here so the composer can drive optimistic inserts.
  const messagesStore = useGroupDmMessages(groupDmId);

  // Typing indicator — listens on the same groupdm:<id> room the message
  // hook already joins. Backend was extended to broadcast typing:update to
  // this room when peers send typing:start/stop with `{ groupDmId }`.
  const typers = useGroupDmTyping(groupDmId, myUserId);

  // Read receipts — track each member's latestReadMessageId from socket
  // events. Used by DmMessageRow to render a ✓✓ "seen" tick on the most
  // recent message you sent that's been read by anyone else.
  const { latestReadByOthers } = useDmReadReceipts(groupDmId, myUserId);

  // When the message store has new messages and we're viewing the DM,
  // notify the server we've read up to the latest. Throttled by message id
  // — only emit when the latest id changes, not on every render.
  const lastEmittedReadIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (groupDmId == null) return;
    const messages = messagesStore.messages;
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.id < 0) return; // skip optimistic temps
    if (lastEmittedReadIdRef.current === latest.id) return;
    lastEmittedReadIdRef.current = latest.id;
    emitMessageRead({ groupDmId, messageId: latest.id });
  }, [groupDmId, messagesStore.messages]);

  // Best-effort: clear notifications for this DM on entry.
  const markRead = useMarkNotificationsRead();
  const lastMarkedRef = useRef<number | null>(null);
  useEffect(() => {
    if (groupDmId == null) return;
    if (lastMarkedRef.current === groupDmId) return;
    lastMarkedRef.current = groupDmId;
    markRead.mutate({ groupDmId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDmId]);

  if (groupDmId == null) {
    return (
      <div className='flex h-full flex-1 flex-col items-center justify-center gap-2 text-muted-foreground'>
        <Icons.chat className='h-8 w-8 opacity-60' />
        <p className='text-sm'>Select a direct message to start reading</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex h-full flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground'>
        <Icons.warning className='h-10 w-10 text-destructive/70' />
        <p className='text-sm font-medium text-foreground'>Couldn’t load this conversation</p>
        <p className='max-w-md break-words text-xs'>{error.message}</p>
      </div>
    );
  }

  const memberCount = detail?.members?.length ?? 0;
  const previewMembers = detail?.members?.slice(0, 4) ?? [];
  const displayName = dmDisplayName(detail, myUserId);

  return (
    <div className='flex h-full flex-1 flex-col bg-background'>
      <header className='flex h-12 shrink-0 items-center gap-3 border-b px-4'>
        <div className='flex -space-x-2'>
          {previewMembers.map((m) => (
            <Avatar
              key={m.userId}
              className='h-7 w-7 border-2 border-background'
            >
              <AvatarFallback className='text-[10px]'>
                {initialsFor(m.user?.full_name ?? '?')}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-semibold'>
            {isLoading ? <Skeleton className='h-4 w-40' /> : displayName}
          </div>
          {memberCount > 0 && (
            <div className='text-xs text-muted-foreground'>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </div>
          )}
        </div>
        {groupDmId != null && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                aria-label='Conversation options'
              >
                <Icons.ellipsis className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuItem
                variant='destructive'
                disabled={leaveMut.isPending}
                onSelect={() => {
                  // Defer one tick so Radix has time to close the menu before
                  // window.confirm steals focus — otherwise the menu hangs
                  // open behind the confirm dialog.
                  window.setTimeout(handleLeave, 0);
                }}
              >
                <Icons.logout className='h-4 w-4' />
                Leave conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <NotificationsBell />
      </header>

      <DmMessageList
        groupDmId={groupDmId}
        myUserId={myUserId}
        myDisplayName={myDisplayName}
        isOwner={isOwner}
        store={messagesStore}
        latestReadByOthers={latestReadByOthers}
      />

      <TypingIndicator typers={typers} />

      <DmComposer
        groupDmId={groupDmId}
        canPost={canPost}
        placeholder={`Message ${displayName}`}
        myUserId={myUserId}
        myDisplayName={myDisplayName}
        onOptimisticInsert={messagesStore.addOptimisticMessage}
        onOptimisticReplace={messagesStore.replaceOptimisticMessage}
        onOptimisticRemove={messagesStore.removeOptimisticMessage}
      />
    </div>
  );
}
