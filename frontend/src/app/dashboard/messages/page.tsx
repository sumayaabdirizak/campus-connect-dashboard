'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquareDashed } from 'lucide-react';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { InboxList } from '@/components/inbox/inbox-list';
import { MessagesDiscoverPane } from '@/components/inbox/messages-discover-pane';
import { isOfficeMessagesOnlyRole } from '@/components/inbox/inbox-helpers';
import { useMessagesActiveChat } from '@/lib/inbox/services/use-messages-active-chat';
import { useInbox, inboxKeys } from '@/lib/inbox/queries';
import { useQueryClient } from '@/lib/async-query';
import { clubKeys } from '@/lib/clubs/queries';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import { bumpReconnectGeneration } from '@/lib/discussions/queries/socket-state';
import { DmPane } from '@/components/discussions/dms';
import { ChannelPane } from '@/components/discussions/channel';
import { ClubDetailPane } from '@/components/clubs/club-detail/club-detail-pane';
import { ClubManagePane } from '@/components/clubs/manage/club-manage-pane';
import { MessagesOfficePane } from '@/components/inbox/messages-office-pane';
import { MessagesOfficeDeskPane } from '@/components/inbox/messages-office-desk-pane';
import { messagesClubHref } from '@/lib/inbox/services/messages-href';
import { useOfficeMessageSocket } from '@/lib/offices/queries';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

function MessagesPageInner() {
  const role = useAuthStore((s) => s.user?.role);
  const officeOnly = isOfficeMessagesOnlyRole(role);
  const { active, openHref, openDiscover, closeChat } = useMessagesActiveChat();
  const { refetch, isFetching } = useInbox();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  useOfficeMessageSocket(true);
  const searchParams = useSearchParams();
  const showDiscover = !officeOnly && active?.kind === 'discover';
  const aoBlockedPane =
    officeOnly &&
    (active?.kind === 'discover' ||
      active?.kind === 'club' ||
      active?.kind === 'club-manage' ||
      active?.kind === 'channel');
  const showChat = Boolean(active) && !aoBlockedPane;
  const threadOpen = Boolean(searchParams?.get('thread'));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force-refresh inbox + clubs + open channel/DM panes (reconnect bump).
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: discussionKeys.all });
      bumpReconnectGeneration();
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refetch]);

  return (
    <div
      data-comm
      className='flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-muted'
    >
      <PosPageHeader
        title='Messages'
        parentLabel='Dashboard'
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing || isFetching}
        className='mb-2 shrink-0 px-0.5 sm:mb-3'
      />

      <div className='flex h-0 min-h-0 w-full min-w-0 flex-1 basis-0 overflow-hidden rounded-[10px] border border-border bg-card'>
        <aside
          className={cn(
            'flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-border md:w-[260px] md:border-r lg:w-[300px] xl:w-[340px]',
            showChat && threadOpen
              ? 'hidden'
              : showChat
                ? 'hidden md:flex'
                : 'flex'
          )}
        >
          <InboxList
            activeHref={
              active?.kind === 'discover'
                ? undefined
                : active?.kind === 'club-manage'
                  ? messagesClubHref(active.slug)
                  : active?.href
            }
            onSelect={openHref}
            onConversationOpened={openHref}
            onDiscover={officeOnly ? undefined : openDiscover}
            discoverActive={showDiscover}
          />
        </aside>

        <section
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
            showChat ? 'flex' : 'hidden md:flex'
          )}
        >
          {showChat ? (
            <>
              <button
                type='button'
                onClick={closeChat}
                className='flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-3 text-sm font-medium text-muted-foreground hover:text-foreground md:hidden'
              >
                <ArrowLeft className='size-4' />
                Back
              </button>
              <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                {showDiscover ? <MessagesDiscoverPane /> : null}
                {!officeOnly && active?.kind === 'club' ? (
                  <ClubDetailPane
                    slug={active.slug}
                    showMobileStrip={false}
                  />
                ) : null}
                {!officeOnly && active?.kind === 'club-manage' ? (
                  <ClubManagePane slug={active.slug} />
                ) : null}
                {active?.kind === 'dm' ? <DmPane groupDmId={active.id} /> : null}
                {!officeOnly && active?.kind === 'channel' ? (
                  <ChannelPane channelId={active.id} />
                ) : null}
                {active?.kind === 'office' ? (
                  <MessagesOfficePane
                    threadId={active.id}
                    onClose={closeChat}
                  />
                ) : null}
                {active?.kind === 'office-desk' ? (
                  <MessagesOfficeDeskPane
                    slug={active.slug}
                    onClose={closeChat}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className='mx-auto flex max-w-sm flex-1 flex-col items-center justify-center space-y-3 p-8 text-center'>
              <div className='flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary'>
                <MessageSquareDashed className='size-8' />
              </div>
              <h2 className='text-lg font-semibold text-foreground'>
                Select a chat
              </h2>
              <p className='text-sm text-muted-foreground'>
                {officeOnly
                  ? 'Choose an office desk from the list to open a conversation.'
                  : 'Choose a conversation from the list, or tap Discover for clubs.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPageInner />
    </Suspense>
  );
}

