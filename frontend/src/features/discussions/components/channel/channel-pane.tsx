'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import {
  useChannel,
  useChannelMembers,
  useChannelPins,
  useMarkNotificationsRead,
  useServer
} from '../../api/queries';
import { useDiscussionPermissions } from '../../hooks/use-discussion-permissions';
import { useDiscussionServerRoom } from '../../hooks/use-discussion-room';
import { useChannelMessages } from '../../hooks/use-channel-messages';
import { useChannelTyping } from '../../hooks/use-channel-typing';
import { MessageList } from './message-list';
import { MessageComposer } from '../composer/message-composer';
import { PinnedStrip } from './pinned-strip';
import { TypingIndicator } from './typing-indicator';
import { ChannelSearchPopover } from './channel-search-popover';
import { ChannelSettingsDialog } from './channel-settings-dialog';
import { ThreadPanel } from '../threads/thread-panel';
import { DetailsPanel } from '../details/details-panel';
import { NotificationsBell } from '../notifications/notifications-panel';

function setQueryParam(
  current: URLSearchParams,
  key: string,
  value: string | null
): string {
  const next = new URLSearchParams(current);
  if (value == null) next.delete(key);
  else next.set(key, value);
  const qs = next.toString();
  return qs ? `?${qs}` : '';
}

export function ChannelPane({ channelId }: { channelId: number | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadParam = searchParams?.get('thread');
  const threadRootId = threadParam ? Number(threadParam) : null;
  const validThreadId =
    Number.isFinite(threadRootId) && (threadRootId ?? 0) > 0 ? threadRootId : null;

  const myUser = useAuthStore((s) => s.user);
  const myUserId = myUser?.id != null ? Number(myUser.id) : null;

  // ?highlight=<messageId> is set when navigating from a server-wide search
  // result. Picks up here, scrolls to + pulses the message, then strips the
  // param so reloading doesn't re-highlight.
  const highlightParam = searchParams?.get('highlight');
  const incomingHighlightId = highlightParam
    ? Number(highlightParam)
    : null;

  const { data: channelData, isLoading } = useChannel(channelId);
  const channel = channelData?.channel ?? null;
  const { data: serverData } = useServer(channel?.serverId ?? null);
  // Join the server-wide socket room while we're in any of its channels —
  // this is what delivers realtime presence:update events. Refcounted, so
  // navigating between channels in the same server is a no-op for the join.
  useDiscussionServerRoom(channel?.serverId ?? null);
  const { data: memberData } = useChannelMembers(channelId);
  const { data: pinsData } = useChannelPins(channelId);
  const perms = useDiscussionPermissions(channelData?.myPermissions);

  const pinnedSet = useMemo(
    () => new Set((pinsData?.results ?? []).map((p) => p.messageId)),
    [pinsData]
  );

  // Lifted here so the composer can drive optimistic inserts. The MessageList
  // is now a pure renderer of this store.
  const messagesStore = useChannelMessages(channelId);

  // Typing presence — names of people currently typing in this channel.
  const typers = useChannelTyping(channelId, myUserId);

  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // When we land on a channel with ?highlight=X, jump to the message and
  // strip the param so reloads don't re-highlight.
  useEffect(() => {
    if (
      incomingHighlightId == null ||
      !Number.isFinite(incomingHighlightId) ||
      incomingHighlightId <= 0
    ) {
      return;
    }
    setHighlightedId(incomingHighlightId);
    const t = window.setTimeout(() => setHighlightedId(null), 2000);
    // Strip the highlight param without reloading.
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.delete('highlight');
    const qs = next.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingHighlightId]);

  // Mark this server's notifications as read once when the channel mounts.
  const markRead = useMarkNotificationsRead();
  const lastMarkedGroupRef = useRef<number | null>(null);
  const groupId = channel?.serverId ?? null;
  useEffect(() => {
    if (groupId == null) return;
    if (lastMarkedGroupRef.current === groupId) return;
    lastMarkedGroupRef.current = groupId;
    markRead.mutate({ groupId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const openThread = useCallback(
    (messageId: number) => {
      router.replace(
        `${window.location.pathname}${setQueryParam(
          new URLSearchParams(searchParams?.toString() ?? ''),
          'thread',
          String(messageId)
        )}`
      );
    },
    [router, searchParams]
  );

  const closeThread = useCallback(() => {
    router.replace(
      `${window.location.pathname}${setQueryParam(
        new URLSearchParams(searchParams?.toString() ?? ''),
        'thread',
        null
      )}`
    );
  }, [router, searchParams]);

  const jumpToMessage = useCallback((messageId: number) => {
    setHighlightedId(messageId);
    // Clear after the highlight animation has played twice (matches CSS).
    window.setTimeout(() => setHighlightedId(null), 2000);
  }, []);

  if (channelId == null) {
    return (
      <div className='flex h-full flex-1 flex-col items-center justify-center gap-2 text-muted-foreground'>
        <Icons.chat className='h-8 w-8 opacity-60' />
        <p className='text-sm'>Select a channel to start reading</p>
      </div>
    );
  }

  const memberCount = memberData?.results?.length ?? 0;
  const e2eeEnabled = serverData?.server?.e2eeEnabled;
  const e2eeKeyVersion = serverData?.server?.e2eeCurrentKeyVersion;

  return (
    <div className='flex h-full flex-1'>
      <div className='flex min-w-0 flex-1 flex-col bg-background'>
        <header className='flex h-12 shrink-0 items-center gap-3 border-b px-4'>
          <Icons.hash className='h-4 w-4 text-muted-foreground' />
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-semibold'>
              {isLoading ? <Skeleton className='h-4 w-32' /> : channel?.name}
            </div>
            {channel?.topic ? (
              <div className='truncate text-xs text-muted-foreground'>{channel.topic}</div>
            ) : null}
          </div>
          {memberCount > 0 && (
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Icons.teams className='h-3 w-3' />
              {memberCount}
            </div>
          )}
          {e2eeEnabled && (
            <span
              title='End-to-end encrypted'
              className='flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'
            >
              <Icons.lock className='h-3 w-3' />
              E2EE
            </span>
          )}
          <ChannelSearchPopover
            channelId={channelId}
            channelName={channel?.name}
            serverId={channel?.serverId ?? null}
            onJump={jumpToMessage}
            onJumpToChannel={(targetChannelId, messageId) => {
              if (channel?.serverId == null) return;
              router.push(
                `/dashboard/chat/${channel.serverId}/${targetChannelId}?highlight=${messageId}`
              );
            }}
          />
          {perms.canManageChannel && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              aria-label='Channel settings'
              onClick={() => setSettingsOpen(true)}
            >
              <Icons.settings className='h-4 w-4' />
            </Button>
          )}
          <NotificationsBell />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className={cn(
              'h-8 w-8',
              detailsOpen && 'bg-muted text-foreground'
            )}
            onClick={() => setDetailsOpen((v) => !v)}
            aria-label={detailsOpen ? 'Close channel details' : 'Open channel details'}
            aria-pressed={detailsOpen}
          >
            <Icons.info className='h-4 w-4' />
          </Button>
        </header>

        <PinnedStrip
          channelId={channelId}
          canManagePins={perms.canPin}
          onJump={jumpToMessage}
        />

        <MessageList
          channelId={channelId}
          myUserId={myUserId}
          myDisplayName={
            myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null
          }
          perms={perms}
          channelName={channel?.name}
          pinnedSet={pinnedSet}
          onReplyInThread={openThread}
          highlightMessageId={highlightedId}
          store={messagesStore}
        />

        <TypingIndicator typers={typers} />

        <MessageComposer
          channelId={channelId}
          channelName={channel?.name}
          channelSlug={channel?.slug}
          serverName={serverData?.server?.name}
          perms={perms}
          e2eeEnabled={e2eeEnabled}
          e2eeKeyVersion={e2eeKeyVersion}
          myUserId={myUserId}
          myDisplayName={
            myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null
          }
          onOptimisticInsert={messagesStore.addOptimisticMessage}
          onOptimisticReplace={messagesStore.replaceOptimisticMessage}
          onOptimisticRemove={messagesStore.removeOptimisticMessage}
        />
      </div>

      {validThreadId != null && (
        <ThreadPanel
          channelId={channelId}
          threadRootId={validThreadId}
          channelName={channel?.name}
          myUserId={myUserId}
          myDisplayName={
            myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null
          }
          perms={perms}
          pinnedSet={pinnedSet}
          e2eeEnabled={e2eeEnabled}
          e2eeKeyVersion={e2eeKeyVersion}
          onClose={closeThread}
        />
      )}

      {detailsOpen && (
        <DetailsPanel channelId={channelId} onClose={() => setDetailsOpen(false)} />
      )}

      <ChannelSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        channel={channel}
        myPermissions={channelData?.myPermissions ?? null}
        myServerPermissions={serverData?.myServerPermissions ?? null}
        onChannelHardDeleted={() => {
          setSettingsOpen(false);
          if (channel?.serverId != null) {
            router.push(`/dashboard/chat/${channel.serverId}`);
          }
        }}
        onJumpToPinnedMessage={(messageId) => {
          jumpToMessage(messageId);
        }}
      />
    </div>
  );
}
