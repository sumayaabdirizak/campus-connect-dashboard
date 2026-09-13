/** Parse inbox / deep-link href into an openable conversation target. */

import {
  messagesChannelHref,
  messagesDmHref,
  messagesServerHref,
} from './messages-href';

export type ParsedInboxHref =
  | { kind: 'dm'; groupDmId: string; href: string }
  | { kind: 'channel'; channelId: string; serverId: string | null; href: string }
  | { kind: 'group'; serverId: string; href: string }
  | { kind: 'external'; href: string };

function parseMessagesQuery(raw: string): ParsedInboxHref | null {
  if (!raw.startsWith('/dashboard/messages')) return null;
  const qIndex = raw.indexOf('?');
  if (qIndex < 0) return { kind: 'external', href: raw };
  const params = new URLSearchParams(raw.slice(qIndex + 1));
  const dm = params.get('dm')?.trim();
  if (dm) {
    return { kind: 'dm', groupDmId: dm, href: messagesDmHref(dm) };
  }
  const channel = params.get('channel')?.trim() || null;
  const server = params.get('server')?.trim() || null;
  if (channel) {
    return {
      kind: 'channel',
      channelId: channel,
      serverId: server,
      href: messagesChannelHref(channel, server),
    };
  }
  if (server) {
    return {
      kind: 'group',
      serverId: server,
      href: messagesServerHref(server),
    };
  }
  return { kind: 'external', href: raw };
}

export function parseInboxHref(href: string): ParsedInboxHref {
  const raw = String(href || '').trim();
  if (!raw) return { kind: 'external', href: raw };

  if (raw.startsWith('/dashboard/offices')) {
    return { kind: 'external', href: '/dashboard/messages' };
  }

  const fromMessages = parseMessagesQuery(raw);
  if (fromMessages) return fromMessages;

  const dm = raw.match(/\/dashboard\/chat\/dm\/(\d+)/);
  if (dm) {
    const groupDmId = dm[1];
    return { kind: 'dm', groupDmId, href: messagesDmHref(groupDmId) };
  }

  const withChannel = raw.match(/\/dashboard\/chat\/(\d+)\/(\d+)/);
  if (withChannel) {
    const serverId = withChannel[1];
    const channelId = withChannel[2];
    return {
      kind: 'channel',
      serverId,
      channelId,
      href: messagesChannelHref(channelId, serverId),
    };
  }

  const groupOnly = raw.match(/\/dashboard\/chat\/(\d+)\/?$/);
  if (groupOnly) {
    const serverId = groupOnly[1];
    return {
      kind: 'group',
      serverId,
      href: messagesServerHref(serverId),
    };
  }

  return { kind: 'external', href: raw };
}
