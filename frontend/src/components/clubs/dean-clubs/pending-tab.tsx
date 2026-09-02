'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-2 [-webkit-overflow-scrolling:touch]'>
        <div className='mx-auto max-w-xl space-y-1'>
          {isLoading ? (
            <>
              <Skeleton className='h-28 rounded-lg' />
              <Skeleton className='h-28 rounded-lg' />
            </>
          ) : clubs.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-2 py-12'>
              <Icons.circleCheck className='h-8 w-8 text-muted-foreground/50' />
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
      </div>

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
