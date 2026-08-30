'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import PageContainer from '@/features/layout/components/page-container';
import { OfficeDirectory } from '@/components/offices/office-directory';
import { OfficeInbox } from '@/components/offices/office-inbox';
import { useOfficeMessageSocket } from '@/lib/offices/queries';
import { messagesOfficeThreadHref } from '@/lib/inbox/services/messages-href';
import { scheduleRouterReplace } from '@/lib/safe-router-navigation';

/**
 * Office directory / staff inbox. Conversation threads open in Messages
 * (Chats), same shell as DMs.
 */
export default function OfficesPage() {
  const router = useRouter();
  const [threadId, setThreadId] = useQueryState('thread', parseAsInteger);
  const [inboxSlug, setInboxSlug] = useQueryState('inbox', parseAsString);
  useOfficeMessageSocket(true);

  useEffect(() => {
    if (threadId != null && threadId > 0) {
      scheduleRouterReplace(router, messagesOfficeThreadHref(threadId));
    }
  }, [threadId, router]);

  if (threadId != null && threadId > 0) {
    return (
      <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
        Opening chat…
      </div>
    );
  }

  return (
    <PageContainer
      pageTitle='Offices'
      pageDescription='Message the academic, exam, and other university offices — replies open in Messages.'
    >
      {inboxSlug ? (
        <div className='w-full'>
          <OfficeInbox
            slug={inboxSlug}
            onBack={() => void setInboxSlug(null)}
            onOpenThread={(id) => {
              void setThreadId(null);
              router.push(messagesOfficeThreadHref(id));
            }}
          />
        </div>
      ) : (
        <div className='w-full'>
          <OfficeDirectory
            onOpenThread={(id) => router.push(messagesOfficeThreadHref(id))}
            onOpenInbox={(slug) => void setInboxSlug(slug)}
          />
        </div>
      )}
    </PageContainer>
  );
}
