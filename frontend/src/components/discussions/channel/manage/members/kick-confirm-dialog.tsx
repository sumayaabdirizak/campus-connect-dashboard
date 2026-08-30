'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/components/alert-dialog'
import { Icons } from '@/components/icons'
import type { ChannelMember } from '@/lib/discussions/queries'

export function KickConfirmDialog({
  target,
  onClose,
  onSubmit,
  isPending,
}: {
  target: ChannelMember | null
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
}) {
  const name = target?.user?.full_name?.trim() || 'this member'

  return (
    <AlertDialog
      open={target != null}
      onOpenChange={(next) => !next && onClose()}
    >
      <AlertDialogContent className='rounded-xl border-border sm:max-w-md'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-foreground'>
            Remove from channel?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-muted-foreground'>
            {name} will lose access to this server’s channels. Their messages
            stay.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            className='rounded-lg border-border'
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className='rounded-lg bg-red-600 text-white hover:bg-red-700'
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            {isPending ? (
              <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
            ) : null}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
