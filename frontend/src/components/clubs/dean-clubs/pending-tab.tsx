'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Icons } from '@/components/icons'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePendingClubs, useApproveClub, useRejectClub } from '@/lib/clubs/queries'
import type { Club } from '@/lib/clubs/types'
import { PendingClubCard } from './pending-club-card'

export function PendingTab() {
  const { data, isLoading } = usePendingClubs()
  const approveMutation = useApproveClub()
  const rejectMutation = useRejectClub()

  const [approveTarget, setApproveTarget] = useState<Club | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Club | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const handleApproveConfirm = () => {
    if (!approveTarget) return
    setApprovingId(approveTarget.id)
    approveMutation.mutate(approveTarget.id, {
      onSettled: () => setApprovingId(null),
    })
    setApproveTarget(null)
  }

  const handleReject = () => {
    if (!rejectTarget) return
    rejectMutation.mutate(
      { clubId: rejectTarget.id, reason: rejectReason.trim() || undefined },
      {
        onSuccess: () => {
          setRejectTarget(null)
          setRejectReason('')
        },
      }
    )
  }

  const clubs = (data?.clubs ?? []) as Club[]

  return (
    <>
      <ScrollArea className='flex-1'>
        <div className='mx-auto max-w-3xl space-y-4 p-6'>
          {isLoading ? (
            <>
              <Skeleton className='h-32 rounded-xl' />
              <Skeleton className='h-32 rounded-xl' />
            </>
          ) : clubs.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-2 py-16'>
              <Icons.circleCheck className='h-10 w-10 text-muted-foreground/50' />
              <h3 className='text-sm font-medium'>All caught up!</h3>
              <p className='text-xs text-muted-foreground'>
                No pending club applications to review
              </p>
            </div>
          ) : (
            clubs.map((club) => (
              <PendingClubCard
                key={club.id}
                club={club}
                onApprove={() => setApproveTarget(club)}
                onReject={() => setRejectTarget(club)}
                isApproving={approvingId === club.id}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Club?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{approveTarget?.name}</strong> will become an active club visible to all
              faculty members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveConfirm}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Reject Club Application</DialogTitle>
            <DialogDescription>
              Rejecting <strong>{rejectTarget?.name}</strong>. Optionally provide a reason — the
              applicant will see it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder='Reason (optional)'
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
