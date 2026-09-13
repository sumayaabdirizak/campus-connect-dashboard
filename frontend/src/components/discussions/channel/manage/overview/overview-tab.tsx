'use client'

import { Button } from '@/features/ui/components/button'
import { Icons } from '@/components/icons'
import type { DiscussionChannel } from '@/lib/discussions/queries'
import { LockChannelToggle } from './channel-toggles'
import { OverviewFields } from './overview-fields'
import { useOverviewTab } from './use-overview-tab'

export function OverviewTab({
  channel,
  canManageRoles,
  onSaved,
  onCancel,
}: {
  channel: DiscussionChannel
  canManageRoles: boolean
  onSaved: () => void
  onCancel: () => void
}) {
  const o = useOverviewTab(channel, canManageRoles, onSaved)

  return (
    <div className='space-y-5'>
      {o.isArchived ? (
        <p className='rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800'>
          Archived — restore from Danger to edit.
        </p>
      ) : null}

      <OverviewFields
        name={o.name}
        setName={o.setName}
        topic={o.topic}
        setTopic={o.setTopic}
        isArchived={o.isArchived}
      />

      <div className='overflow-hidden rounded-lg border border-border'>
        <LockChannelToggle
          locked={o.isChannelLocked}
          onToggle={o.handleLockChannel}
          isArchived={o.isArchived}
          canManageRoles={canManageRoles}
          everyoneRoleId={o.everyoneRoleId}
          lockBusy={o.lockBusy}
        />
      </div>

      <div className='flex items-center justify-end gap-2 border-t border-border pt-4'>
        <Button
          type='button'
          variant='outline'
          className='h-10 rounded-lg border-border'
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type='button'
          className='h-10 rounded-lg bg-primary text-white hover:bg-[#2563EB] disabled:bg-[#93C5FD]'
          onClick={o.handleSave}
          disabled={!o.canSave}
        >
          {o.updatePending ? (
            <Icons.spinner className='mr-1.5 h-4 w-4 animate-spin' />
          ) : null}
          Save
        </Button>
      </div>
    </div>
  )
}
