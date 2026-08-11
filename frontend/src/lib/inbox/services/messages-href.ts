/** Canonical Messages deep-link builders (replaces /dashboard/chat). */

export function messagesDmHref(groupDmId: string): string {
  return `/dashboard/messages?dm=${groupDmId}`;
}

export function messagesChannelHref(
  channelId: string,
  serverId?: string | null
): string {
  const q = new URLSearchParams();
  q.set('channel', channelId);
  if (serverId) {
    q.set('server', serverId);
  }
  return `/dashboard/messages?${q.toString()}`;
}

export function messagesServerHref(serverId: string): string {
  return `/dashboard/messages?server=${serverId}`;
}

export function messagesDiscoverHref(): string {
  return '/dashboard/messages?discover=1';
}

/** Club page inside Messages (left inbox + club). */
export function messagesClubHref(slug: string): string {
  return `/dashboard/messages?club=${encodeURIComponent(slug)}`;
}

/** Club manage inside Messages (same Chats inbox as club detail). */
export function messagesClubManageHref(slug: string): string {
  return `/dashboard/messages?club=${encodeURIComponent(slug)}&manage=1`;
}

/** Office support thread inside Messages (same Chats list as DMs). */
export function messagesOfficeThreadHref(threadId: number): string {
  return `/dashboard/messages?officeThread=${threadId}`;
}

/** Office desk hub — message / view conversations without a prior thread. */
export function messagesOfficeDeskHref(slug: string): string {
  return `/dashboard/messages?officeDesk=${encodeURIComponent(slug)}`;
}
