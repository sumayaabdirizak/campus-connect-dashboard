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
import { useAllFacultyClubs, useSuspendClub } from '@/lib/clubs/queries'
import type { Club } from '@/lib/clubs/types'
import { FacultyClubRow } from './faculty-club-row'

const STATUSES = ['APPROVED', 'SUSPENDED', 'REJECTED'] as const

export function AllClubsTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
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
      <div className='flex flex-wrap gap-2 px-6 pt-4'>
        <button
          onClick={() => setStatusFilter(undefined)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !statusFilter
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <ScrollArea className='flex-1'>
        <div className='mx-auto max-w-3xl space-y-3 p-6'>
          {isLoading ? (
            <>
              <Skeleton className='h-24 rounded-xl' />
              <Skeleton className='h-24 rounded-xl' />
            </>
          ) : clubs.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-2 py-16'>
              <Icons.teams className='h-10 w-10 text-muted-foreground/50' />
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
      </ScrollArea>

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
