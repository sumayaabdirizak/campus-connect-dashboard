'use client';

import { useMemo, useState } from 'react';
import {
  useChannelMembers,
  useKickServerMember,
  useMuteServerMember,
  useServer,
  useServerPresence
} from '../../../../api/queries';
import { useDiscussionPermissions } from '../../../../hooks/use-discussion-permissions';
import type {
  ChannelMember,
  DiscussionChannel,
  DiscussionRole,
  PresenceState
} from '../../../../api/types';
import {
  isoFromLocalInputValue,
  isoFromMinutesFromNow,
  localInputMinValue,
  PAGE_SIZE
} from './member-format';

export function useMembersTab(
  channel: DiscussionChannel,
  myPermissions: string | null | undefined
) {
  const perms = useDiscussionPermissions(myPermissions);
  const canMute = perms.canMuteMembers;
  const canKick = perms.canKickMembers || perms.canModerateMembers;

  const { data, isLoading, error } = useChannelMembers(channel.id);
  const { data: presenceData } = useServerPresence(channel.serverId);
  const { data: serverData } = useServer(channel.serverId);
  const ownerId = serverData?.server?.ownerId ?? null;

  const kickMut = useKickServerMember(channel.serverId, channel.id);
  const muteMut = useMuteServerMember(channel.serverId, channel.id);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [kickTarget, setKickTarget] = useState<ChannelMember | null>(null);
  const [kickConfirmText, setKickConfirmText] = useState('');
  const [muteCustomTarget, setMuteCustomTarget] = useState<ChannelMember | null>(null);
  const [muteCustomUntil, setMuteCustomUntil] = useState('');

  const presenceById = useMemo(() => {
    const map = new Map<number, PresenceState>();
    for (const row of presenceData?.results ?? []) {
      map.set(Number(row.userId), row.presence);
    }
    return map;
  }, [presenceData]);

  const sortedMembers = useMemo(() => {
    const rank: Record<DiscussionRole, number> = {
      OWNER: 0,
      ADMIN: 1,
      MODERATOR: 2,
      MEMBER: 3
    };
    return [...(data?.results ?? [])].sort((a, b) => {
      const rd = rank[a.role] - rank[b.role];
      if (rd !== 0) return rd;
      return (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '');
    });
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedMembers;
    return sortedMembers.filter((m) => {
      const name = (m.user?.full_name ?? '').toLowerCase();
      const email = (m.user?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [sortedMembers, query]);

  const total = filtered.length;
  const needsPagination = total > PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = needsPagination ? safePage * PAGE_SIZE : 0;
  const end = needsPagination ? start + PAGE_SIZE : total;
  const pageRows = filtered.slice(start, end);

  const kickTargetName = kickTarget?.user?.full_name?.trim() ?? '';
  const kickConfirmMatches =
    kickConfirmText.trim().toLowerCase() === kickTargetName.toLowerCase() &&
    kickTargetName.length > 0;

  return {
    canMute,
    canKick,
    isLoading,
    error,
    ownerId,
    presenceById,
    query,
    setQuery: (v: string) => {
      setQuery(v);
      setPage(0);
    },
    total,
    needsPagination,
    pageCount,
    safePage,
    start,
    end,
    pageRows,
    setPage,
    kickTarget,
    kickConfirmText,
    setKickConfirmText,
    muteCustomTarget,
    muteCustomUntil,
    setMuteCustomUntil,
    mutePending: muteMut.isPending,
    kickPending: kickMut.isPending,
    handleMutePreset: (member: ChannelMember, minutes: number) => {
      muteMut.mutate({
        targetUserId: Number(member.userId),
        until: isoFromMinutesFromNow(minutes)
      });
    },
    handleLiftMute: (member: ChannelMember) => {
      muteMut.mutate({ targetUserId: Number(member.userId), until: null });
    },
    openCustomMute: (member: ChannelMember) => {
      setMuteCustomUntil(localInputMinValue());
      setMuteCustomTarget(member);
    },
    closeCustomMute: () => setMuteCustomTarget(null),
    submitCustomMute: () => {
      if (!muteCustomTarget) return;
      const iso = isoFromLocalInputValue(muteCustomUntil);
      if (!iso) return;
      muteMut.mutate(
        { targetUserId: Number(muteCustomTarget.userId), until: iso },
        { onSuccess: () => setMuteCustomTarget(null) }
      );
    },
    openKick: (member: ChannelMember) => {
      setKickConfirmText('');
      setKickTarget(member);
    },
    closeKick: () => setKickTarget(null),
    submitKick: () => {
      if (!kickTarget || !kickConfirmMatches) return;
      kickMut.mutate(Number(kickTarget.userId), {
        onSuccess: () => setKickTarget(null)
      });
    }
  };
}
