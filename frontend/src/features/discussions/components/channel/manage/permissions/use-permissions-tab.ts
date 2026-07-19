'use client';

import { useMemo } from 'react';
import {
  useChannelMembers,
  useChannelOverwrites,
  usePutChannelOverwrite,
  useServer
} from '../../../../api/queries';
import type {
  DiscussionChannel,
  DiscussionOverwriteTarget,
  DiscussionRoleRow
} from '../../../../api/types';

export function usePermissionsTab(channel: DiscussionChannel) {
  const channelId = channel.id;
  const serverId = channel.serverId;

  const { data: overwriteData, isLoading: loadingOverwrites } =
    useChannelOverwrites(channelId);
  const { data: serverDetail, isLoading: loadingServer } = useServer(serverId);
  const { data: memberData, isLoading: loadingMembers } = useChannelMembers(channelId);
  const putMut = usePutChannelOverwrite(channelId);

  const overwrites = overwriteData?.results ?? [];
  const roles: DiscussionRoleRow[] = serverDetail?.roles ?? [];
  const members = memberData?.results ?? [];

  const roleOverwrites = useMemo(
    () =>
      overwrites
        .filter((o) => o.targetType === 'ROLE')
        .sort((a, b) => {
          const ra = roles.find((r) => r.id === a.targetId);
          const rb = roles.find((r) => r.id === b.targetId);
          return (ra?.position ?? 0) - (rb?.position ?? 0) || a.targetId - b.targetId;
        }),
    [overwrites, roles]
  );

  const memberOverwrites = useMemo(
    () =>
      overwrites
        .filter((o) => o.targetType === 'MEMBER')
        .sort((a, b) => a.targetId - b.targetId),
    [overwrites]
  );

  const overriddenRoleIds = useMemo(
    () => new Set(roleOverwrites.map((o) => o.targetId)),
    [roleOverwrites]
  );
  const overriddenMemberIds = useMemo(
    () => new Set(memberOverwrites.map((o) => o.targetId)),
    [memberOverwrites]
  );

  const rolePickerOptions = useMemo(
    () =>
      [...roles]
        .filter((r) => !overriddenRoleIds.has(r.id))
        .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name))
        .map((r) => ({
          id: r.id,
          label: r.name,
          subtitle: null as string | null
        })),
    [roles, overriddenRoleIds]
  );

  const memberPickerOptions = useMemo(
    () =>
      members
        .filter((m) => m.user && !overriddenMemberIds.has(m.userId))
        .map((m) => ({
          id: m.userId,
          label: m.user?.full_name ?? `User ${m.userId}`,
          subtitle: m.user?.email ?? null
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [members, overriddenMemberIds]
  );

  const roleNameById = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);
  const memberById = useMemo(
    () => new Map(members.filter((m) => m.user != null).map((m) => [m.userId, m])),
    [members]
  );

  const handleAdd = (kind: DiscussionOverwriteTarget, id: number) => {
    putMut.mutate({
      targetType: kind,
      targetId: id,
      allow: '0',
      deny: '0'
    });
  };

  const isLoading = loadingOverwrites || loadingServer || loadingMembers;

  return {
    channelId,
    overwrites,
    roleOverwrites,
    memberOverwrites,
    rolePickerOptions,
    memberPickerOptions,
    roleNameById,
    memberById,
    handleAdd,
    isLoading
  };
}
