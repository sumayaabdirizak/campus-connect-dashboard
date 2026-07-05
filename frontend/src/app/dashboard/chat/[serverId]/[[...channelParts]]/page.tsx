'use client';

import { Suspense } from 'react';
import { ChatShellV2 } from '@/features/discussions/components/layout';

/**
 * Handles both `/dashboard/chat/:serverId` and `/dashboard/chat/:serverId/:channelId`.
 * Optional catch-all avoids a Next.js dev routing gap where the two-segment
 * `[serverId]/[channelId]` page was compiled but not registered (404).
 */
export default function ChatServerChannelPage() {
  return (
    <Suspense fallback={null}>
      <ChatShellV2 />
    </Suspense>
  );
}
