'use client';

import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import PageContainer from '@/components/layout/page-container';
import { OfficeDirectory } from '@/features/offices/components/office-directory';
import { OfficeThreadView } from '@/features/offices/components/office-thread-view';
import { OfficeInbox } from '@/features/offices/components/office-inbox';

/**
 * Office communication hub. URL-driven views (nuqs):
 *  - default        → office directory + my conversations
 *  - ?inbox=slug    → staff shared inbox for that office
 *  - ?thread=id     → one conversation (student or staff)
 */
export default function OfficesPage() {
  const [threadId, setThreadId] = useQueryState('thread', parseAsInteger);
  const [inboxSlug, setInboxSlug] = useQueryState('inbox', parseAsString);

  return (
    <PageContainer
      pageTitle='Offices'
      pageDescription='Message the academic, exam, and other university offices — replies land right here.'
    >
      {threadId != null ? (
        <div className='h-[calc(100dvh-14rem)] min-h-[420px] w-full'>
          <OfficeThreadView threadId={threadId} onBack={() => void setThreadId(null)} />
        </div>
      ) : inboxSlug ? (
        <div className='w-full'>
          <OfficeInbox
            slug={inboxSlug}
            onBack={() => void setInboxSlug(null)}
            onOpenThread={(id) => void setThreadId(id)}
          />
        </div>
      ) : (
        <div className='w-full'>
          <OfficeDirectory
            onOpenThread={(id) => void setThreadId(id)}
            onOpenInbox={(slug) => void setInboxSlug(slug)}
          />
        </div>
      )}
    </PageContainer>
  );
}
