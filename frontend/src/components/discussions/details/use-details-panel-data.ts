'use client';

import { useMemo, useState } from 'react';
import { confirmAction } from '@/lib/notifications';
import {
  useChannel,
  useChannelMembers,
  useRemoveServerMember,
  useServer,
  useServerPresence,
} from '@/lib/discussions/queries/queries';
import { useChannelMessages } from '@/lib/discussions/services/use-channel-messages';
import { useDiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions';
import type { PresenceState } from '@/lib/discussions/queries/types';
import { fileNameFromUrl } from './details-helpers';
import type { AggregatedAttachment } from './attachment-row';

export type DetailsTab = 'members' | 'files' | 'pinned';

export function useDetailsPanelData(channelId: string) {
  const { data: channelData } = useChannel(channelId);
  const { data: memberData } = useChannelMembers(channelId);
  const serverId = channelData?.channel?.serverId ?? null;
  const { data: serverData } = useServer(serverId);
  const serverPerms = useDiscussionPermissions(serverData?.myServerPermissions);
  const removeMemberMut = useRemoveServerMember(serverId ?? '');
  const { data: presenceData } = useServerPresence(serverId);
  const { messages } = useChannelMessages(channelId);

  const [tab, setTab] = useState<DetailsTab>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [attachmentSearch, setAttachmentSearch] = useState('');

  const channel = channelData?.channel ?? null;
  const members = useMemo(() => memberData?.results ?? [], [memberData]);

  const handleRemoveMember = async (userId: number, name: string) => {
    if (
      !(await confirmAction(
        `Remove ${name}?`,
        "They'll lose access until re-invited. Their messages will stay in the channel.",
        'Remove member',
        { danger: true, icon: 'warning' }
      ))
    ) {
      return;
    }
    removeMemberMut.mutate(userId);
  };

  const presenceByUser = useMemo(() => {
    const map = new Map<number, PresenceState>();
    for (const row of presenceData?.results ?? []) {
      map.set(Number(row.userId), row.presence);
    }
    return map;
  }, [presenceData]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const haystack = [m.user?.full_name, m.user?.email, m.user?.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, memberSearch]);

  const attachments = useMemo<AggregatedAttachment[]>(() => {
    const out: AggregatedAttachment[] = [];
    for (const m of messages) {
      if (m.deletedAt) continue;
      for (const a of m.attachments ?? []) {
        out.push({
          attachment: a,
          messageId: m.id,
          senderName: m.isAnonymous ? 'Anonymous' : (m.sender?.full_name ?? 'Unknown'),
          createdAt: m.createdAt,
        });
      }
    }
    return out.toReversed();
  }, [messages]);

  const filteredAttachments = useMemo(() => {
    const q = attachmentSearch.trim().toLowerCase();
    if (!q) return attachments;
    return attachments.filter((row) =>
      fileNameFromUrl(row.attachment.url).toLowerCase().includes(q)
    );
  }, [attachments, attachmentSearch]);

  return {
    channel,
    tab,
    setTab,
    members,
    filteredMembers,
    memberSearch,
    setMemberSearch,
    attachments,
    filteredAttachments,
    attachmentSearch,
    setAttachmentSearch,
    presenceByUser,
    canModerate: serverPerms.canModerateMembers || serverPerms.isAdmin,
    handleRemoveMember,
  };
}
