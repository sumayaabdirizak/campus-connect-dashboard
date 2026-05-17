'use client';

import { useEffect } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useServers } from '../../api/queries';
import { ServerRail } from './server-rail';
import { ChannelSidebar } from './channel-sidebar';
import { ChannelPane } from '../channel';

function toFiniteId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Top-level discussion shell. Owns:
 *   - 3-column Slack-style layout: server rail · channel sidebar · message pane
 *   - reads the active server / channel from the URL
 *   - on first load with no selection, redirects to the user's first server's
 *     defaultChannel (Slack/Discord behaviour)
 *   - `/dashboard/chat/dm/*` redirects into server chat (DMs are not surfaced here)
 */
export function ChatShellV2() {
  const params = useParams();
  const pathname = usePathname() ?? '';
  const router = useRouter();

  const routeServerId = toFiniteId(params?.serverId);
  const routeChannelId = toFiniteId(params?.channelId);
  const routeGroupDmId = toFiniteId(params?.groupDmId);
  const isDmRoute = pathname.startsWith('/dashboard/chat/dm');

  const { data: serversData, isLoading: serversLoading } = useServers();
  const firstServer = serversData?.results?.[0] ?? null;
  const firstServerId = firstServer?.id ?? null;
  const firstDefaultChannelId = firstServer?.defaultChannelId ?? null;

  useEffect(() => {
    if (isDmRoute || routeGroupDmId != null) {
      if (serversLoading) return;
      const dmTarget =
        firstDefaultChannelId != null && firstServerId != null
          ? `/dashboard/chat/${firstServerId}/${firstDefaultChannelId}`
          : firstServerId != null
            ? `/dashboard/chat/${firstServerId}`
            : '/dashboard/clubs';
      router.replace(dmTarget);
      return;
    }

    if (routeServerId != null) return;
    if (serversLoading) return;
    if (firstServerId == null) return;
    const target = firstDefaultChannelId
      ? `/dashboard/chat/${firstServerId}/${firstDefaultChannelId}`
      : `/dashboard/chat/${firstServerId}`;
    router.replace(target);
  }, [
    routeServerId,
    routeGroupDmId,
    isDmRoute,
    firstServerId,
    firstDefaultChannelId,
    serversLoading,
    router
  ]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className='flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background'>
        <ServerRail activeServerId={routeServerId} />
        <ChannelSidebar serverId={routeServerId} activeChannelId={routeChannelId} />
        <main className='flex min-w-0 flex-1 flex-col'>
          <ChannelPane channelId={routeChannelId} />
        </main>
      </div>
    </TooltipProvider>
  );
}
