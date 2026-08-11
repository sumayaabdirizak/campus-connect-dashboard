'use client'

import { Input } from '@/features/ui/components/input'
import { Skeleton } from '@/features/ui/components/skeleton'
import { Icons } from '@/components/icons'
import type { DiscussionChannel } from '@/lib/discussions/queries'
import { KickConfirmDialog } from './kick-confirm-dialog'
import { MemberRow } from './member-row'
import { MembersPagination } from './members-pagination'
import { useMembersTab } from './use-members-tab'

export function MembersTab({
  channel,
  myPermissions,
}: {
  channel: DiscussionChannel
  myPermissions: string | null | undefined
}) {
  const m = useMembersTab(channel, myPermissions)

  if (m.error) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-10 text-center'>
        <Icons.warning className='size-5 text-red-600' />
        <p className='text-sm font-medium text-red-700'>Couldn’t load members</p>
        <p className='max-w-sm text-xs text-red-600/80'>{m.error.message}</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <div className='relative min-w-0 flex-1'>
          <Icons.search className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#9CA3AF]' />
          <Input
            value={m.query}
            onChange={(e) => m.setQuery(e.target.value)}
            placeholder='Search members'
            className='h-10 rounded-lg border-[#E5E7EB] pl-9 text-[#101828] placeholder:text-[#9CA3AF]'
            aria-label='Search channel members'
          />
        </div>
        {!m.isLoading ? (
          <span className='shrink-0 rounded-md bg-[#F8FAFC] px-2.5 py-2 text-xs font-medium tabular-nums text-[#667085]'>
            {m.total}
          </span>
        ) : null}
      </div>

      {m.isLoading ? (
        <div className='divide-y divide-[#E5E7EB] overflow-hidden rounded-lg border border-[#E5E7EB]'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center gap-3 px-3.5 py-3'>
              <Skeleton className='size-9 rounded-full' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-3.5 w-28' />
                <Skeleton className='h-2.5 w-20' />
              </div>
            </div>
          ))}
        </div>
      ) : m.total === 0 ? (
        <div className='flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#E5E7EB] py-12 text-center'>
          <span className='flex size-10 items-center justify-center rounded-full bg-[#F8FAFC]'>
            <Icons.teams className='size-4 text-[#9CA3AF]' />
          </span>
          <p className='text-sm font-medium text-[#101828]'>
            {m.query.trim().length > 0 ? 'No matches' : 'No members yet'}
          </p>
          <p className='text-xs text-[#667085]'>
            {m.query.trim().length > 0
              ? 'Try a different name or email.'
              : 'People who join this channel will show up here.'}
          </p>
        </div>
      ) : (
        <div className='divide-y divide-[#E5E7EB] overflow-hidden rounded-lg border border-[#E5E7EB]'>
          {m.pageRows.map((row) => {
            const isOwner =
              m.ownerId != null && Number(row.userId) === Number(m.ownerId)
            return (
              <MemberRow
                key={row.userId}
                member={row}
                presence={m.presenceById.get(Number(row.userId))}
                showActions={!isOwner && m.canKick}
                onRemove={m.openKick}
              />
            )
          })}
        </div>
      )}

      {m.needsPagination && m.total > 0 ? (
        <MembersPagination
          start={m.start}
          end={m.end}
          total={m.total}
          safePage={m.safePage}
          pageCount={m.pageCount}
          onPrev={() => m.setPage((p) => Math.max(0, p - 1))}
          onNext={() => m.setPage((p) => Math.min(m.pageCount - 1, p + 1))}
        />
      ) : null}

      <KickConfirmDialog
        target={m.kickTarget}
        onClose={m.closeKick}
        onSubmit={m.submitKick}
        isPending={m.kickPending}
      />
    </div>
  )
}
