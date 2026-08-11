'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useChannelOverwrites,
  useDeleteChannelOverwrite,
  usePutChannelOverwrite,
  useServer,
  useUpdateChannel
} from '@/lib/discussions/queries';
import type {
  DiscussionChannel,
  DiscussionChannelKind
} from '@/lib/discussions/queries';
import { LOCK_DENY_BITS, toBigIntMask, UNCATEGORIZED } from './constants';
import { buildChannelUpdateBody, computeOverviewDirty } from './overview-dirty';
import { applyChannelLock } from './overview-lock';

export function useOverviewTab(
  channel: DiscussionChannel,
  canManageRoles: boolean,
  onSaved: () => void
) {
  const updateMut = useUpdateChannel(channel.id);
  const { data: serverDetail } = useServer(channel.serverId);
  const { data: overwritesData } = useChannelOverwrites(channel.id, {
    enabled: canManageRoles
  });
  const putOverwriteMut = usePutChannelOverwrite(channel.id);
  const deleteOverwriteMut = useDeleteChannelOverwrite(channel.id);

  const initialCategoryValue =
    channel.categoryId == null ? UNCATEGORIZED : String(channel.categoryId);
  const initialKind: DiscussionChannelKind =
    channel.kind === 'ANNOUNCEMENT' || channel.kind === 'FORUM'
      ? channel.kind
      : 'TEXT';

  const [name, setName] = useState(channel.name ?? '');
  const [topic, setTopic] = useState(channel.topic ?? '');
  const [categoryValue, setCategoryValue] = useState(initialCategoryValue);
  const [kind, setKind] = useState<DiscussionChannelKind>(initialKind);

  useEffect(() => {
    setName(channel.name ?? '');
    setTopic(channel.topic ?? '');
    setCategoryValue(
      channel.categoryId == null ? UNCATEGORIZED : String(channel.categoryId)
    );
    setKind(
      channel.kind === 'ANNOUNCEMENT' || channel.kind === 'FORUM'
        ? channel.kind
        : 'TEXT'
    );
  }, [
    channel.id,
    channel.name,
    channel.topic,
    channel.categoryId,
    channel.kind
  ]);

  const everyoneRoleId = useMemo(() => {
    const roles = serverDetail?.roles ?? [];
    const byKey = roles.find((r) => r.systemKey === 'EVERYONE');
    if (byKey) return byKey.id;
    const byName = roles.find((r) => {
      const n = r.name.trim().toLowerCase();
      return n === '@everyone' || n === 'everyone';
    });
    return byName?.id ?? null;
  }, [serverDetail?.roles]);

  const everyoneOverwrite = useMemo(() => {
    if (everyoneRoleId == null) return undefined;
    return (overwritesData?.results ?? []).find(
      (o) => o.targetType === 'ROLE' && o.targetId === everyoneRoleId
    );
  }, [overwritesData?.results, everyoneRoleId]);

  const isChannelLocked = useMemo(() => {
    if (!everyoneOverwrite) return false;
    const d = toBigIntMask(everyoneOverwrite.deny);
    return (d & LOCK_DENY_BITS) === LOCK_DENY_BITS;
  }, [everyoneOverwrite]);

  const isArchived = !!channel.archivedAt;
  const dirtyState = computeOverviewDirty({
    channel,
    name,
    topic,
    categoryValue,
    initialCategoryValue,
    kind,
    initialKind
  });
  const canSave =
    dirtyState.dirty &&
    dirtyState.nameValid &&
    !updateMut.isPending &&
    !isArchived;

  const handleSave = () => {
    if (!canSave) return;
    updateMut.mutate(
      buildChannelUpdateBody({
        channel,
        ...dirtyState,
        categoryValue,
        kind
      }),
      { onSuccess: () => onSaved() }
    );
  };

  const handleLockChannel = (nextLocked: boolean) => {
    if (isArchived || !canManageRoles || everyoneRoleId == null) return;
    applyChannelLock({
      nextLocked,
      everyoneRoleId,
      everyoneOverwrite,
      putOverwriteMut,
      deleteOverwriteMut
    });
  };

  return {
    name,
    setName,
    topic,
    setTopic,
    everyoneRoleId,
    isChannelLocked,
    isArchived,
    canSave,
    updatePending: updateMut.isPending,
    lockBusy: putOverwriteMut.isPending || deleteOverwriteMut.isPending,
    handleSave,
    handleLockChannel
  };
}
