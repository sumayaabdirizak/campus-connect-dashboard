'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/components/dialog'
import type {
  DiscussionChannel,
  DiscussionChannelCategory,
} from '@/lib/discussions/queries/types'
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
  serverId: string
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
