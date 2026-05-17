'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { usePendingClubs, useApproveClub, useRejectClub } from '@/features/clubs/api/queries'
import type { Club } from '@/features/clubs/api/types'

export default function DeanClubsPage() {
  const { data, isLoading } = usePendingClubs()
  const approveMutation = useApproveClub()
  const rejectMutation = useRejectClub()

  const [rejectTarget, setRejectTarget] = useState<Club | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = (clubId: number) => {
    approveMutation.mutate(clubId)
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
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-6 py-4'>
        <div>
          <h1 className='text-xl font-semibold'>Club Approvals</h1>
          <p className='text-sm text-muted-foreground'>
            Review and approve pending club applications
          </p>
        </div>
        {clubs.length > 0 && (
          <Badge variant='secondary'>
            {clubs.length} pending
          </Badge>
        )}
      </div>

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
                onApprove={() => handleApprove(club.id)}
                onReject={() => setRejectTarget(club)}
                isApproving={approveMutation.isPending}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Reject Club Application</DialogTitle>
            <DialogDescription>
              Rejecting <strong>{rejectTarget?.name}</strong>. Optionally provide a
              reason — the applicant will see it.
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
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setRejectTarget(null)}
            >
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
    </div>
  )
}

function PendingClubCard({
  club,
  onApprove,
  onReject,
  isApproving,
}: {
  club: Club
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
}) {
  const themeColor = club.themeColor || '#6366f1'

  return (
    <div className='overflow-hidden rounded-xl border'>
      {/* Mini banner */}
      <div
        className='h-16'
        style={{
          background: club.bannerUrl
            ? `url(${club.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${themeColor}40, ${themeColor}15)`,
        }}
      />

      <div className='space-y-3 p-4'>
        <div className='flex items-start justify-between'>
          <div>
            <h3 className='font-semibold'>{club.name}</h3>
            {club.tagline && (
              <p className='text-xs text-muted-foreground'>{club.tagline}</p>
            )}
          </div>
          <div className='flex gap-1.5'>
            <Badge variant='outline' className='text-[10px]'>
              {club.joinPolicy?.toLowerCase().replace('_', ' ')}
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              {club.scopeKind?.toLowerCase()}
            </Badge>
          </div>
        </div>

        {club.description && (
          <p className='text-sm text-muted-foreground'>{club.description}</p>
        )}

        {club.rules && (
          <div className='rounded border bg-muted/30 p-2.5'>
            <p className='mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
              Rules
            </p>
            <p className='line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground'>
              {club.rules}
            </p>
          </div>
        )}

        {/* Applicant */}
        {club.owner && (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Icons.user className='h-3 w-3' />
            Applied by <strong>{club.owner.full_name}</strong>
            {club.owner.email && <span>({club.owner.email})</span>}
          </div>
        )}

        {club.faculty && (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Icons.teams className='h-3 w-3' />
            Faculty: <strong>{club.faculty.name}</strong>
          </div>
        )}

        {/* Interest tags */}
        {club.interests && club.interests.length > 0 && (
          <div className='flex flex-wrap gap-1'>
            {club.interests.map((tag) => (
              <Badge key={tag.slug} variant='secondary' className='text-[10px]'>
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className='flex items-center justify-end gap-2 pt-1'>
          <Button
            variant='outline'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={onReject}
          >
            Reject
          </Button>
          <Button
            size='sm'
            onClick={onApprove}
            disabled={isApproving}
            style={{ backgroundColor: themeColor }}
          >
            {isApproving ? (
              <>
                <Icons.spinner className='mr-1.5 h-3 w-3 animate-spin' />
                Approving...
              </>
            ) : (
              <>
                <Icons.check className='mr-1.5 h-3 w-3' />
                Approve
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
