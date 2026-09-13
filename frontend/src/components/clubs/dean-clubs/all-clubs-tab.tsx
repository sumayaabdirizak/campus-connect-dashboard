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
import { useAllFacultyClubs, useSuspendClub } from '@/lib/clubs/queries'
import type { Club } from '@/lib/clubs/types'
import { FacultyClubRow } from './faculty-club-row'

export function AllClubsTab({ statusFilter }: { statusFilter?: string }) {
  const { data, isLoading } = useAllFacultyClubs(statusFilter)
  const suspendMutation = useSuspendClub()

  const [suspendTarget, setSuspendTarget] = useState<Club | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendingId, setSuspendingId] = useState<number | null>(null)

  const handleSuspend = () => {
    if (!suspendTarget) return
    setSuspendingId(suspendTarget.id)
    suspendMutation.mutate(
      { clubId: suspendTarget.id, reason: suspendReason.trim() || undefined },
      {
        onSuccess: () => {
          setSuspendTarget(null)
          setSuspendReason('')
        },
        onSettled: () => setSuspendingId(null),
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
              <Skeleton className='h-20 rounded-lg' />
              <Skeleton className='h-20 rounded-lg' />
            </>
          ) : clubs.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-2 py-12'>
              <Icons.teams className='h-8 w-8 text-muted-foreground/50' />
              <p className='text-sm text-muted-foreground'>No clubs found</p>
            </div>
          ) : (
            clubs.map((club) => (
              <FacultyClubRow
                key={club.id}
                club={club}
                onSuspend={() => setSuspendTarget(club)}
                isSuspending={suspendingId === club.id}
              />
            ))
          )}
        </div>
      </div>

      <Dialog open={!!suspendTarget} onOpenChange={() => setSuspendTarget(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Suspend Club</DialogTitle>
            <DialogDescription>
              <strong>{suspendTarget?.name}</strong> will be suspended. Members will lose access.
              Optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder='Reason (optional)'
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={handleSuspend}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend Club'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
