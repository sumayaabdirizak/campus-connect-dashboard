'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { listChannelAuditLog } from '../../../api/service';
import type { DiscussionAuditLogEntry } from '../../../api/types';

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    CHANNEL_UPDATE: 'Channel updated',
    CHANNEL_ARCHIVE: 'Channel archived',
    CHANNEL_UNARCHIVE: 'Channel restored',
    CHANNEL_HARD_DELETE: 'Channel deleted',
    PERMISSION_OVERWRITE_UPSERT: 'Permission overwrite saved',
    PERMISSION_OVERWRITE_DELETE: 'Permission overwrite removed',
    MESSAGE_PIN: 'Message pinned',
    MESSAGE_UNPIN: 'Message unpinned',
    MEMBER_MUTE: 'Member muted',
    MEMBER_UNMUTE: 'Mute lifted',
    MEMBER_KICK: 'Member removed from server'
  };
  return map[action] ?? action;
}

function JsonSnippet({ value }: { value: unknown }) {
  if (value == null) return <span className='text-muted-foreground'>—</span>;
  try {
    const s = JSON.stringify(value, null, 0);
    const compact = s.length > 160 ? `${s.slice(0, 157)}…` : s;
    return (
      <code className='block max-h-24 overflow-auto rounded bg-muted/60 px-1.5 py-1 text-[10px] leading-snug'>
        {compact}
      </code>
    );
  } catch {
    return <span className='text-muted-foreground'>…</span>;
  }
}

export function AuditLogTab({ channelId }: { channelId: number }) {
  const [rows, setRows] = useState<DiscussionAuditLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(async (cursor: string | null, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listChannelAuditLog(channelId, cursor);
      setRows((prev) => (append ? [...prev, ...data.results] : data.results));
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [channelId]);

  useEffect(() => {
    setRows([]);
    setNextCursor(null);
    void fetchPage(null, false);
  }, [channelId, fetchPage]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    void fetchPage(nextCursor, true);
  };

  if (loading && rows.length === 0) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-14 w-full' />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'>
        Couldn’t load the audit log. {error.message}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='rounded-md border border-dashed py-10 text-center text-xs text-muted-foreground'>
        No audit entries yet for this channel.
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <p className='text-xs text-muted-foreground'>
        Recent changes from moderators and channel settings. Oldest pages load
        below.
      </p>
      <ul className='space-y-2'>
        {rows.map((entry) => (
          <li
            key={entry.id}
            className='rounded-md border bg-card px-3 py-2 text-xs shadow-sm'
          >
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <span className='font-medium'>{actionLabel(entry.action)}</span>
              <time
                className='shrink-0 text-[10px] text-muted-foreground'
                dateTime={entry.createdAt}
              >
                {new Date(entry.createdAt).toLocaleString()}
              </time>
            </div>
            <div className='mt-1 text-[11px] text-muted-foreground'>
              {entry.actor?.full_name ?? `User #${entry.actorUserId}`} ·{' '}
              <span className='font-mono'>
                {entry.targetType}#{entry.targetId}
              </span>
            </div>
            {(entry.before != null || entry.after != null) && (
              <div className='mt-2 grid gap-1 sm:grid-cols-2'>
                <div>
                  <div className='mb-0.5 text-[10px] font-medium uppercase text-muted-foreground'>
                    Before
                  </div>
                  <JsonSnippet value={entry.before} />
                </div>
                <div>
                  <div className='mb-0.5 text-[10px] font-medium uppercase text-muted-foreground'>
                    After
                  </div>
                  <JsonSnippet value={entry.after} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {nextCursor ? (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-full'
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
          ) : null}
          Load older
        </Button>
      ) : null}
    </div>
  );
}
