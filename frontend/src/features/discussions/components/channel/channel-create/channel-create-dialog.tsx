'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  DiscussionChannel,
  DiscussionChannelCategory,
} from '../../../api/types'
import { ChannelCreateForm } from './channel-create-form'
import { useChannelCreateForm } from './use-channel-create-form'

export function ChannelCreateDialog({
  open,
  onOpenChange,
  serverId,
  categories,
  existingChannels,
  defaultCategoryId,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  serverId: number
  categories: DiscussionChannelCategory[]
  existingChannels: DiscussionChannel[]
  defaultCategoryId: number | null
}) {
  const form = useChannelCreateForm({
    open,
    serverId,
    categories,
    existingChannels,
    defaultCategoryId,
    onOpenChange,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where people in this server have conversations.
          </DialogDescription>
        </DialogHeader>
        <ChannelCreateForm
          {...form}
          onCancel={() => onOpenChange(false)}
          onSubmit={form.handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
