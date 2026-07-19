'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { DiscussionChannel } from '../../../../api/types';
import { ChannelKindPicker } from './channel-kind-picker';
import {
  LockChannelToggle,
  PrivateChannelToggle
} from './channel-toggles';
import { OverviewFields } from './overview-fields';
import { useOverviewTab } from './use-overview-tab';

export function OverviewTab({
  channel,
  canManageRoles,
  onSaved,
  onCancel
}: {
  channel: DiscussionChannel;
  canManageRoles: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const o = useOverviewTab(channel, canManageRoles, onSaved);

  return (
    <div className='space-y-4'>
      {o.isArchived ? (
        <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400'>
          This channel is archived. Restore it from the Danger zone to edit name
          and topic.
        </div>
      ) : null}

      <OverviewFields
        name={o.name}
        setName={o.setName}
        topic={o.topic}
        setTopic={o.setTopic}
        categoryValue={o.categoryValue}
        setCategoryValue={o.setCategoryValue}
        categoryChanged={o.categoryChanged}
        categories={o.sortedCategories}
        isArchived={o.isArchived}
        trimmedNameLength={o.trimmedNameLength}
      />

      <ChannelKindPicker
        kind={o.kind}
        setKind={o.setKind}
        isArchived={o.isArchived}
      />

      <PrivateChannelToggle
        isPrivate={o.isPrivate}
        setIsPrivate={o.setIsPrivate}
        isDefault={!!channel.isDefault}
        isArchived={o.isArchived}
      />

      <LockChannelToggle
        locked={o.isChannelLocked}
        onToggle={o.handleLockChannel}
        isArchived={o.isArchived}
        canManageRoles={canManageRoles}
        everyoneRoleId={o.everyoneRoleId}
        lockBusy={o.lockBusy}
      />

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={o.handleSave} disabled={!o.canSave}>
          {o.updatePending ? (
            <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
          ) : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}
