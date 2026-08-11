'use client'

import { useEffect } from 'react'
import { Button } from '@/features/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/components/dialog'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { MAX_OTHER_MEMBERS, MIN_OTHER_MEMBERS } from './constants'
import { DmCandidatePicker } from './dm-candidate-picker'
import { useDmCreateForm } from './use-dm-create-form'

export function DmCreateDialog({
  open,
  onOpenChange,
  onOpened,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  onOpened?: (href: string) => void
}) {
  const form = useDmCreateForm(open, onOpenChange, onOpened)

  useEffect(() => {
    if (open) window.setTimeout(() => form.searchRef.current?.focus(), 0)
  }, [open, form.searchRef])

  const description = form.deanGroupMode
    ? `Pick at least ${MIN_OTHER_MEMBERS} people — Deans, Office Staff, or both. Filter roles and use Select all for the list shown.`
    : form.facultyDeanMode
      ? `Choose teachers, students, or your faculty office staff (${MIN_OTHER_MEMBERS + 1}–${MAX_OTHER_MEMBERS + 1} total).`
      : `Choose at least ${MIN_OTHER_MEMBERS} people (you + them = ${MIN_OTHER_MEMBERS + 1}–${MAX_OTHER_MEMBERS + 1}). Filter by Students / Teachers, then department → batch → section — or search.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-lg'
        )}
      >
        <DialogHeader className='shrink-0 space-y-1.5 border-b bg-background px-6 pt-6 pb-4 pr-12 text-left'>
          <DialogTitle>
            {form.deanGroupMode ? 'New staff group' : 'New group message'}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          <DmCandidatePicker
            key={form.deanGroupMode ? 'ao' : form.facultyDeanMode ? 'dean' : 'student'}
            {...form}
          />
        </div>

        <DialogFooter className='shrink-0 gap-2 border-t bg-background px-6 py-4 sm:gap-0'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={form.handleCreate}
            disabled={form.tooFew || form.create.isPending}
            className='bg-[#3B82F6] text-white hover:bg-[#2563EB]'
          >
            {form.create.isPending ? (
              <Icons.spinner className='h-4 w-4 animate-spin' />
            ) : (
              <>
                Create group
                {form.selected.length > 0
                  ? ` · ${form.selected.length + 1}`
                  : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
