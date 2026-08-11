'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import { confirmDelete } from '@/lib/notifications';
import {
  useAddReply,
  useDeleteReply,
  useUpdateReply
} from '@/lib/course-details/queries/feed-queries';
import type { CoursePost } from '@/lib/course-details/types';

export function RepliesSection({
  post,
  userId,
  userName,
  courseId
}: {
  post: CoursePost;
  userId: number | null;
  userName: string | null;
  courseId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const addMutation = useAddReply(courseId, userId, userName);
  const updateMutation = useUpdateReply(courseId);
  const deleteMutation = useDeleteReply(courseId);
  const replies = post.replies ?? [];

  const handleAdd = () => {
    if (!draft.trim()) return;
    addMutation.mutate(
      { postId: post.id, content: draft.trim() },
      {
        onSuccess: () => {
          setDraft('');
          setExpanded(true);
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
    <div className='mt-2'>
      <button
        type='button'
        onClick={() => setExpanded((v) => !v)}
        className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
      >
        <MessageSquare className='w-3 h-3' />
        {replies.length === 0
          ? 'Reply'
          : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
      </button>

      {expanded ? (
        <div className='mt-2 pl-3 border-l space-y-2'>
          {replies.map((r) => (
            <div key={r.id} className='text-sm'>
              <div className='flex items-baseline gap-2 mb-0.5'>
                <span className='font-medium'>{r.author.full_name}</span>
                <span
                  className='text-xs text-muted-foreground'
                  title={new Date(r.created_at).toLocaleString()}
                >
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
                {r.authorId === userId ? (
                  <span className='ml-auto flex gap-1'>
                    <button
                      type='button'
                      className='text-xs text-muted-foreground hover:text-foreground'
                      onClick={() => {
                        setEditingId(r.id);
                        setEditDraft(r.content);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type='button'
                      className='text-xs text-muted-foreground hover:text-destructive'
                      onClick={async () => {
                        if (!(await confirmDelete('this reply'))) return;
                        deleteMutation.mutate(r.id);
                      }}
                    >
                      Delete
                    </button>
                  </span>
                ) : null}
              </div>
              {editingId === r.id ? (
                <div className='flex gap-1'>
                  <Input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    className='h-8 text-sm'
                  />
                  <Button size='sm' onClick={saveEdit} disabled={updateMutation.isPending}>
                    Save
                  </Button>
                  <Button size='sm' variant='ghost' onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className='select-text text-sm whitespace-pre-wrap'>{r.content}</p>
              )}
            </div>
          ))}

          <div className='flex gap-1 mt-2'>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder='Write a reply…'
              className='h-8 text-sm'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              size='sm'
              onClick={handleAdd}
              disabled={addMutation.isPending || !draft.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
