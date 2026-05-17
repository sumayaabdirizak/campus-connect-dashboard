'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { useClubJoinRequests, useDecideJoinRequest } from '../../api/queries'
import type { Club, ClubJoinRequest } from '../../api/types'

export function RequestsTab({ club }: { club: Club }) {
  const { data, isLoading } = useClubJoinRequests(club.id)
  const decideMutation = useDecideJoinRequest(club.id)

  const requests = data?.requests ?? []

  const handleDecide = (requestId: number, approve: boolean) => {
    decideMutation.mutate({ requestId, approve })
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-16 rounded-lg' />
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-sm font-medium'>Join Requests</h3>
          <p className='text-xs text-muted-foreground'>
            Approve or reject pending membership requests
          </p>
        </div>
        {requests.length > 0 && (
          <Badge variant='secondary'>
            {requests.length} pending
          </Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <div className='flex flex-col items-center gap-2 py-12'>
          <Icons.circleCheck className='h-8 w-8 text-muted-foreground/50' />
          <p className='text-sm text-muted-foreground'>No pending requests</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {requests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              themeColor={club.themeColor || '#6366f1'}
              onApprove={() => handleDecide(req.id, true)}
              onReject={() => handleDecide(req.id, false)}
              isDeciding={decideMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestRow({
  request,
  themeColor,
  onApprove,
  onReject,
  isDeciding,
}: {
  request: ClubJoinRequest
  themeColor: string
  onApprove: () => void
  onReject: () => void
  isDeciding: boolean
}) {
  const user = request.user

  return (
    <div className='flex items-center gap-3 rounded-lg border px-4 py-3'>
      {/* Avatar */}
      <div
        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold'
        style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=''
            className='h-full w-full rounded-full object-cover'
          />
        ) : (
          (user?.full_name ?? '?')
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('')
        )}
      </div>

      {/* Info */}
      <div className='flex-1 min-w-0'>
        <p className='truncate text-sm font-medium'>
          {user?.full_name ?? `User #${request.userId}`}
        </p>
        <p className='truncate text-xs text-muted-foreground'>
          {user?.email ?? ''}
          {request.requestedAt && (
            <span className='ml-1.5'>
              &middot; {new Date(request.requestedAt).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className='flex gap-1.5'>
        <Button
          variant='outline'
          size='sm'
          className='h-7 text-xs text-destructive hover:text-destructive'
          onClick={onReject}
          disabled={isDeciding}
        >
          Reject
        </Button>
        <Button
          size='sm'
          className='h-7 text-xs'
          onClick={onApprove}
          disabled={isDeciding}
          style={{ backgroundColor: themeColor }}
        >
          {isDeciding ? (
            <Icons.spinner className='h-3 w-3 animate-spin' />
          ) : (
            'Approve'
          )}
        </Button>
      </div>
    </div>
  )
}
