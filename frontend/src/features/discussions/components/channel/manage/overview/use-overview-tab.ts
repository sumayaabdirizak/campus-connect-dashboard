'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useChannelOverwrites,
  useDeleteChannelOverwrite,
  usePutChannelOverwrite,
  useServer,
  useUpdateChannel
} from '../../../../api/queries';
import type {
  DiscussionChannel,
  DiscussionChannelKind
} from '../../../../api/types';
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
  const [isPrivate, setIsPrivate] = useState(!!channel.isPrivate);

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
    setIsPrivate(!!channel.isPrivate);
  }, [
    channel.id,
    channel.name,
    channel.topic,
    channel.categoryId,
    channel.kind,
    channel.isPrivate
  ]);

  const sortedCategories = useMemo(() => {
    const list = serverDetail?.categories ?? [];
    return [...list].sort((a, b) => a.position - b.position || a.id - b.id);
  }, [serverDetail?.categories]);

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
    initialKind,
    isPrivate
  });
  const canSave =
    dirtyState.dirty &&
    dirtyState.nameValid &&
    !updateMut.isPending &&
    !isArchived &&
    !dirtyState.blockedByDefault;

  const handleSave = () => {
    if (!canSave) return;
    updateMut.mutate(
      buildChannelUpdateBody({
        channel,
        ...dirtyState,
        categoryValue,
        kind,
        isPrivate
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
    categoryValue,
    setCategoryValue,
    kind,
    setKind,
    isPrivate,
    setIsPrivate,
    sortedCategories,
    everyoneRoleId,
    isChannelLocked,
    isArchived,
    trimmedNameLength: dirtyState.trimmedName.length,
    categoryChanged: dirtyState.categoryChanged,
    canSave,
    updatePending: updateMut.isPending,
    lockBusy: putOverwriteMut.isPending || deleteOverwriteMut.isPending,
    handleSave,
    handleLockChannel
  };
}
