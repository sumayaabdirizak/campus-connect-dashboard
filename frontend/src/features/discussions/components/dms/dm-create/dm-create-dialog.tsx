'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Icons } from '@/components/icons'
import { MAX_OTHER_MEMBERS, MIN_OTHER_MEMBERS } from './constants'
import { DmCandidatePicker } from './dm-candidate-picker'
import { useDmCreateForm } from './use-dm-create-form'

export function DmCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
}) {
  const form = useDmCreateForm(open, onOpenChange)

  useEffect(() => {
    if (open) window.setTimeout(() => form.searchRef.current?.focus(), 0)
  }, [open, form.searchRef])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
          <DialogDescription>
            Pick {MIN_OTHER_MEMBERS}–{MAX_OTHER_MEMBERS} people from your workspaces.
          </DialogDescription>
        </DialogHeader>

        <DmCandidatePicker {...form} />

        <DialogFooter>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={form.handleCreate} disabled={form.tooFew || form.create.isPending}>
            {form.create.isPending ? (
              <Icons.spinner className='h-4 w-4 animate-spin' />
            ) : (
              <>Create{form.selected.length > 0 && ` (${form.selected.length + 1})`}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
