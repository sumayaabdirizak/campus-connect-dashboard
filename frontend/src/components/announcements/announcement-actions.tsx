'use client';

import { useEffect, useState } from 'react';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { toggleAnnouncementLike } from '@/lib/announcements/services';
import { useQueryClient } from '@/lib/async-query';
import type { Announcement } from '@/lib/announcements/types';

export function AnnouncementActions({ announcement }: { announcement: Announcement }) {
  const id = Number(announcement.id);
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(Boolean(announcement.likedByCurrentUser));
  const [likeCount, setLikeCount] = useState(announcement.likes ?? 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(Boolean(announcement.likedByCurrentUser));
    setLikeCount(announcement.likes ?? 0);
  }, [announcement.id, announcement.likedByCurrentUser, announcement.likes]);

  const patchLikeInCache = (likedByCurrentUser: boolean, likes: number) => {
    const patch = (current: Announcement[] | undefined) => {
      const list = current ?? [];
      return list.map((item) =>
        String(item.id) === String(id) ? { ...item, likedByCurrentUser, likes } : item
      );
    };
    queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'list'], patch);
    queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'scheduled'], patch);
    queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'drafts'], patch);
  };

  const onLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setBusy(true);
    try {
      const res = await toggleAnnouncementLike(id);
      setLiked(res.likedByCurrentUser);
      setLikeCount(res.likes);
      patchLikeInCache(res.likedByCurrentUser, res.likes);
    } catch {
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
      toast.error('Could not update reaction');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='flex items-center gap-3'>
      <button
        type='button'
        onClick={onLike}
        disabled={busy}
        aria-pressed={liked}
        aria-label={liked ? 'Remove like' : 'Like post'}
        className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
          liked ? 'text-red-500' : 'text-foreground/65 hover:text-red-500'
        }`}
      >
        <Icons.heart className='h-3.5 w-3.5' />
        {likeCount > 0 ? <span className='text-[10px]'>{likeCount}</span> : null}
      </button>
    </div>
  );
}
