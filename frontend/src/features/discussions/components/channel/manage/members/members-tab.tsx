'use client';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import type { DiscussionChannel } from '../../../../api/types';
import { KickConfirmDialog } from './kick-confirm-dialog';
import { MemberRow } from './member-row';
import { MembersPagination } from './members-pagination';
import { MuteCustomDialog } from './mute-custom-dialog';
import { useMembersTab } from './use-members-tab';

export function MembersTab({
  channel,
  myPermissions
}: {
  channel: DiscussionChannel;
  myPermissions: string | null | undefined;
}) {
  const m = useMembersTab(channel, myPermissions);

  if (m.error) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 py-10 text-center text-sm text-destructive'>
        <Icons.warning className='h-5 w-5' />
        <span>Couldn’t load members.</span>
        <span className='max-w-sm text-xs opacity-80'>{m.error.message}</span>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <Icons.search className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={m.query}
          onChange={(e) => m.setQuery(e.target.value)}
          placeholder='Search by name or email'
          className='h-9 pl-8'
          aria-label='Search channel members'
        />
      </div>

      {m.isLoading ? (
        <div className='space-y-1.5'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='flex items-center gap-3 px-2 py-2'>
              <Skeleton className='h-8 w-8 rounded-full' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-3 w-32' />
                <Skeleton className='h-2.5 w-24' />
              </div>
            </div>
          ))}
        </div>
      ) : m.total === 0 ? (
        <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-center'>
          <Icons.teams className='h-5 w-5 text-muted-foreground' />
          <p className='text-xs text-muted-foreground'>
            {m.query.trim().length > 0
              ? 'No members match this search.'
              : 'No members yet.'}
          </p>
        </div>
      ) : (
        <div className='space-y-0.5'>
          {m.pageRows.map((row) => {
            const isOwner =
              m.ownerId != null && Number(row.userId) === Number(m.ownerId);
            const showActions = !isOwner && (m.canMute || m.canKick);
            return (
              <MemberRow
                key={row.userId}
                member={row}
                presence={m.presenceById.get(Number(row.userId))}
                showActions={showActions}
                canMute={m.canMute}
                canKick={m.canKick}
                onMutePreset={m.handleMutePreset}
                onMuteCustom={m.openCustomMute}
                onLiftMute={m.handleLiftMute}
                onKick={m.openKick}
              />
            );
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

      <MuteCustomDialog
        target={m.muteCustomTarget}
        until={m.muteCustomUntil}
        setUntil={m.setMuteCustomUntil}
        onClose={m.closeCustomMute}
        onSubmit={m.submitCustomMute}
        isPending={m.mutePending}
      />

      <KickConfirmDialog
        target={m.kickTarget}
        confirmText={m.kickConfirmText}
        setConfirmText={m.setKickConfirmText}
        onClose={m.closeKick}
        onSubmit={m.submitKick}
        isPending={m.kickPending}
      />
    </div>
  );
}
