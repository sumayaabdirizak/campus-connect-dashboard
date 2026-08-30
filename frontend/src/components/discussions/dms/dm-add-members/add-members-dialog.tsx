'use client'

import { useEffect } from 'react'
import { Button } from '@/features/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog'
import { Icons } from '@/components/icons'
import { DmCandidatePicker } from '@/components/discussions/dms/dm-create/dm-candidate-picker'
import { useAddMembersForm } from './use-add-members-form'

export function AddMembersDialog({
  open,
  onOpenChange,
  groupDmId,
  existingMemberIds
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  groupDmId: string
  existingMemberIds: number[]
}) {
  const form = useAddMembersForm(groupDmId, existingMemberIds, open, onOpenChange)

  useEffect(() => {
    if (open) window.setTimeout(() => form.searchRef.current?.focus(), 0)
  }, [open, form.searchRef])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg'>
        <DialogHeader className='shrink-0 space-y-1.5 border-b bg-background px-6 pt-6 pb-4 pr-12 text-left'>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>
            {form.room > 0
              ? `Choose people to add to this conversation (up to ${form.room} more).`
              : 'This conversation is at the member limit.'}
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          <DmCandidatePicker showNameField={false} {...form} />
        </div>

        <DialogFooter className='shrink-0 gap-2 border-t bg-background px-6 py-4 sm:gap-0'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={form.handleAdd}
            disabled={form.tooFew || form.addMembers.isPending}
            className='bg-primary text-white hover:bg-[#2563EB]'
          >
            {form.addMembers.isPending ? (
              <Icons.spinner className='h-4 w-4 animate-spin' />
            ) : (
              <>Add{form.selected.length > 0 ? ` · ${form.selected.length}` : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
