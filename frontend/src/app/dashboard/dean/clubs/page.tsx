'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  usePendingClubs,
  useAllFacultyClubs,
  useApproveClub,
  useRejectClub,
  useSuspendClub,
} from '@/features/clubs/api/queries'
import type { Club } from '@/features/clubs/api/types'

// ── Status badge ────────────────────────────────────────────────────────────
function ClubStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

// ── Pending tab ─────────────────────────────────────────────────────────────
function PendingTab() {
  const { data, isLoading } = usePendingClubs()
  const approveMutation = useApproveClub()
  const rejectMutation = useRejectClub()

  const [approveTarget, setApproveTarget] = useState<Club | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Club | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  // Track which club ID is currently being approved for per-card loading state
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
              <p className='text-xs text-muted-foreground'>No pending club applications to review</p>
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

      {/* Approve confirm */}
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

      {/* Reject dialog */}
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

// ── All clubs tab ────────────────────────────────────────────────────────────
function AllClubsTab() {
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
  const statuses = ['APPROVED', 'SUSPENDED', 'REJECTED']

  return (
    <>
      {/* Status filter pills */}
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
        {statuses.map((s) => (
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
              <div key={club.id} className='overflow-hidden rounded-xl border'>
                <div
                  className='h-10'
                  style={{
                    background: club.bannerUrl
                      ? `url(${club.bannerUrl}) center/cover`
                      : `linear-gradient(135deg, ${club.themeColor ?? '#6366f1'}40, ${club.themeColor ?? '#6366f1'}15)`,
                  }}
                />
                <div className='flex items-start justify-between p-4'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <h3 className='font-semibold'>{club.name}</h3>
                      <ClubStatusBadge status={(club as any).status ?? 'APPROVED'} />
                    </div>
                    {club.tagline && (
                      <p className='text-xs text-muted-foreground'>{club.tagline}</p>
                    )}
                    {club.owner && (
                      <p className='mt-1 text-xs text-muted-foreground'>
                        Owner: <strong>{club.owner.full_name}</strong>
                      </p>
                    )}
                    {(club as any)._count?.members != null && (
                      <p className='text-xs text-muted-foreground'>
                        {(club as any)._count.members} members
                      </p>
                    )}
                  </div>
                  {(club as any).status === 'APPROVED' && (
                    <Button
                      variant='outline'
                      size='sm'
                      className='ml-3 shrink-0 text-orange-600 hover:text-orange-700'
                      onClick={() => setSuspendTarget(club)}
                      disabled={suspendingId === club.id}
                    >
                      {suspendingId === club.id ? 'Suspending...' : 'Suspend'}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Suspend dialog */}
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

// ── Pending club card ────────────────────────────────────────────────────────
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
            {club.tagline && <p className='text-xs text-muted-foreground'>{club.tagline}</p>}
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

        {club.interests && club.interests.length > 0 && (
          <div className='flex flex-wrap gap-1'>
            {club.interests.map((tag) => (
              <Badge key={tag.slug} variant='secondary' className='text-[10px]'>
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        <div className='flex items-center justify-end gap-2 pt-1'>
          <Button
            variant='outline'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={onReject}
          >
            Reject
          </Button>
          <Button size='sm' onClick={onApprove} disabled={isApproving} style={{ backgroundColor: themeColor }}>
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

// ── Main page ────────────────────────────────────────────────────────────────
export default function DeanClubsPage() {
  const { data: pendingData } = usePendingClubs()
  const pendingCount = pendingData?.clubs?.length ?? 0

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between border-b px-6 py-4'>
        <div>
          <h1 className='text-xl font-semibold'>Club Management</h1>
          <p className='text-sm text-muted-foreground'>Review applications and manage faculty clubs</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant='secondary'>{pendingCount} pending</Badge>
        )}
      </div>

      <Tabs defaultValue='pending' className='flex flex-1 flex-col overflow-hidden'>
        <TabsList className='mx-6 mt-4 w-fit'>
          <TabsTrigger value='pending'>
            Pending
            {pendingCount > 0 && (
              <span className='ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='all'>All Clubs</TabsTrigger>
        </TabsList>

        <TabsContent value='pending' className='flex flex-1 flex-col overflow-hidden mt-0'>
          <PendingTab />
        </TabsContent>

        <TabsContent value='all' className='flex flex-1 flex-col overflow-hidden mt-0'>
          <AllClubsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
