'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { confirmDelete } from '@/lib/notifications';
import { timeAgoLong } from '@/lib/format-time';
import {
  useAddReply,
  useDeleteReply,
  useUpdateReply
} from '@/lib/course-details/queries/feed-queries';
import type { CoursePost } from '@/lib/course-details/types';

const LIKE_EMOJI = '❤️';

function initials(name?: string | null) {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function FeedEngagement({
  post,
  userId,
  userName,
  courseId,
  onReact
}: {
  post: CoursePost;
  userId: number | null;
  userName: string | null;
  courseId: string;
  onReact: (emoji: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const addMutation = useAddReply(courseId, userId, userName);
  const updateMutation = useUpdateReply(courseId);
  const deleteMutation = useDeleteReply(courseId);

  const likes = (post.reactions ?? []).filter((r) => r.emoji === LIKE_EMOJI);
  const liked = userId != null && likes.some((r) => r.userId === userId);
  const likeCount = likes.length;
  const replies = post.replies ?? [];
  const commentCount = replies.length;
  const trimmed = draft.trim();

  const likeLabel =
    likeCount === 0
      ? null
      : liked && likeCount === 1
        ? 'You liked this'
        : liked
          ? `You and ${likeCount - 1} other${likeCount - 1 === 1 ? '' : 's'} liked this`
          : `${likeCount} like${likeCount === 1 ? '' : 's'}`;

  const submit = () => {
    if (!trimmed || addMutation.isPending) return;
    addMutation.mutate(
      { postId: post.id, content: trimmed },
      {
        onSuccess: () => {
          setDraft('');
          setShowComments(true);
        }
      }
    );
  };

  const saveEdit = () => {
    if (editingId == null || !editDraft.trim()) return;
    updateMutation.mutate(
      { replyId: editingId, content: editDraft.trim() },
      { onSuccess: () => setEditingId(null) }
    );
  };

  return (
    <div>
      <div className='flex items-center gap-5'>
        <button
          type='button'
          onClick={() => onReact(LIKE_EMOJI)}
          aria-pressed={liked}
          aria-label={liked ? 'Remove like' : 'Like post'}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
          }`}
        >
          <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
          <span>{liked ? 'Liked' : 'Like'}{likeCount > 0 ? ` (${likeCount})` : ''}</span>
        </button>
        <button
          type='button'
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          aria-label={showComments ? 'Hide comments' : 'Show comments'}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            showComments ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'
          }`}
        >
          <MessageCircle className='h-5 w-5' />
          <span>{commentCount > 0 ? `Comments (${commentCount})` : 'Comment'}</span>
        </button>
      </div>

      {likeLabel ? <p className='mt-3 text-xs font-medium text-muted-foreground'>{likeLabel}</p> : null}

      {showComments ? (
        <div className='mt-3 space-y-3 border-t border-border pt-3'>
          {replies.length > 0 ? (
            <div className='space-y-2.5'>
              {replies.map((r) => {
                const name = r.author?.full_name ?? 'Unknown';
                const isMine = r.authorId === userId;
                return (
                  <div key={r.id} className='flex items-start gap-2.5'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
                      {initials(name)}
                    </div>
                    <div className='min-w-0 flex-1 rounded-xl bg-muted px-3 py-2'>
                      <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                        <p className='truncate text-sm font-semibold text-foreground'>{name}</p>
                        <p
                          className='shrink-0 text-xs text-muted-foreground'
                          title={new Date(r.created_at).toLocaleString()}
                        >
                          {timeAgoLong(r.created_at)}
                        </p>
                        {isMine ? (
                          <span className='ml-auto flex shrink-0 gap-2'>
                            <button
                              type='button'
                              className='text-xs font-medium text-muted-foreground hover:text-foreground'
                              onClick={() => {
                                setEditingId(r.id);
                                setEditDraft(r.content);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type='button'
                              className='text-xs font-medium text-muted-foreground hover:text-red-600'
                              onClick={async () => {
                                if (!(await confirmDelete('this comment'))) return;
                                deleteMutation.mutate(r.id);
                              }}
                            >
                              Delete
                            </button>
                          </span>
                        ) : null}
                      </div>
                      {editingId === r.id ? (
                        <div className='mt-1.5 flex items-center gap-2'>
                          <input
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit();
                              }
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className='min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25'
                          />
                          <button
                            type='button'
                            onClick={saveEdit}
                            disabled={updateMutation.isPending || !editDraft.trim()}
                            className='rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40'
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className='mt-0.5 select-text whitespace-pre-wrap break-words text-sm text-foreground'>
                          {r.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className='text-sm font-medium text-muted-foreground'>No comments yet. Add one below.</p>
          )}

          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
              {initials(userName)}
            </div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder='Write a comment…'
              maxLength={10000}
              className='min-w-0 flex-1 rounded-full border-2 border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'
            />
            <button
              type='button'
              onClick={submit}
              disabled={!trimmed || addMutation.isPending}
              className='inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40'
            >
              <Send className='h-4 w-4' />
              {addMutation.isPending ? '…' : 'Post'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
