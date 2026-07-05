'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { toggleAnnouncementLike } from '../api/service';
import { useBookmarks, toggleBookmark } from '../utils/bookmark-store';
import type { Announcement } from '../api/types';

/**
 * Card footer action bar: like (server heart reaction), comment count, and a
 * client-side bookmark. Likes are optimistic and reconciled from the server
 * response; bookmarks live in localStorage (no server table yet).
 */
export function AnnouncementActions({ announcement }: { announcement: Announcement }) {
  const id = Number(announcement.id);
  const [liked, setLiked] = useState(Boolean(announcement.likedByCurrentUser));
  const [likeCount, setLikeCount] = useState(announcement.likes ?? 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(Boolean(announcement.likedByCurrentUser));
    setLikeCount(announcement.likes ?? 0);
  }, [announcement.id, announcement.likedByCurrentUser, announcement.likes]);

  const saved = useBookmarks();
  const isSaved = saved.has(String(announcement.id));

  const onLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    // Optimistic flip.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setBusy(true);
    try {
      const res = await toggleAnnouncementLike(id);
      setLiked(res.likedByCurrentUser);
      setLikeCount(res.likes);
    } catch {
      // Revert on error.
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
      toast.error('Could not update reaction');
    } finally {
      setBusy(false);
    }
  };

  const onSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleBookmark(announcement.id);
  };

  const showComments =
    announcement.commentsEnabled && typeof announcement.commentsCount === 'number';

  return (
    <div className='ms-[44px] flex items-center gap-1 border-t border-border/60 pt-2 sm:ms-[46px]'>
      <button
        type='button'
        onClick={onLike}
        aria-pressed={liked}
        aria-label={liked ? 'Remove reaction' : 'Like'}
        className={cn(
          'inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          liked ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
        )}
      >
        <Heart className={cn('size-4', liked && 'fill-current')} aria-hidden />
        {likeCount > 0 && <span className='tabular-nums'>{likeCount}</span>}
      </button>

      {showComments && (
        <span
          className='inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted-foreground'
          aria-label={`${announcement.commentsCount} comments`}
        >
          <MessageCircle className='size-4' aria-hidden />
          {(announcement.commentsCount ?? 0) > 0 && (
            <span className='tabular-nums'>{announcement.commentsCount}</span>
          )}
        </span>
      )}

      <button
        type='button'
        onClick={onSave}
        aria-pressed={isSaved}
        aria-label={isSaved ? 'Remove from saved' : 'Save'}
        className={cn(
          'ms-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSaved ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <Bookmark className={cn('size-4', isSaved && 'fill-current')} aria-hidden />
        <span className='hidden sm:inline'>{isSaved ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  );
}
