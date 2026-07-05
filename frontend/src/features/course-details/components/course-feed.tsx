'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Search,
  Pin,
  Bot,
  X as XIcon,
  Download,
  MessageSquare,
  Smile,
  Megaphone
} from 'lucide-react';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { QueryErrorState } from '@/components/query-error-state';
import { CoursePageShell } from './_shared/course-page-shell';
import { CoursePostForm } from './course-post-form';
import type { CoursePostFormValues } from '../schemas/course-post';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { useQueryClient } from '@/lib/async-query';
import { deleteCoursePost } from '../api/feed-service';
import { feedKeys } from '../api/feed-queries';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { confirmDelete } from '@/lib/notifications';
import { useAuthStore } from '@/lib/auth-store';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import {
  useAddReply,
  useCourseFeed,
  useCreateCoursePost,
  useDeleteCoursePost,
  useDeleteCoursePostAttachment,
  useDeleteReply,
  useToggleReaction,
  useUpdateCoursePost,
  useUpdateReply,
  useUploadCoursePostAttachments
} from '../api/feed-queries';
import type {
  CoursePost,
  CoursePostReaction,
  CoursePostSource
} from '../api/feed-types';

interface CourseFeedProps {
  courseId: string;
  isStudent?: boolean;
}

type FeedFilter = 'all' | 'important' | 'attachments' | 'auto';

const SOURCE_LABEL: Record<CoursePostSource, string> = {
  MANUAL: '',
  SESSION: 'Session',
  ATTENDANCE: 'Attendance',
  DEAN: 'Dean',
  REGISTRATION: 'Registration'
};

const REACTION_PALETTE = ['👍', '❤️', '🎉', '🤔', '😮', '👏'];

function groupReactions(reactions: CoursePostReaction[]) {
  const map = new Map<string, { count: number; userIds: number[] }>();
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { count: 0, userIds: [] };
    cur.count += 1;
    cur.userIds.push(r.userId);
    map.set(r.emoji, cur);
  }
  return map;
}

function ReactionStrip({
  post,
  userId,
  onToggle
}: {
  post: CoursePost;
  userId: number | null;
  onToggle: (emoji: string) => void;
}) {
  const grouped = groupReactions(post.reactions ?? []);
  const entries = Array.from(grouped.entries());
  return (
    <div className='flex items-center gap-1 flex-wrap'>
      {entries.map(([emoji, info]) => {
        const isMine = userId != null && info.userIds.includes(userId);
        return (
          <button
            key={emoji}
            type='button'
            onClick={() => onToggle(emoji)}
            className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-colors ${
              isMine
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent bg-muted/40 hover:bg-muted/70'
            }`}
            aria-label={`React with ${emoji}`}
          >
            <span>{emoji}</span>
            <span className='tabular-nums'>{info.count}</span>
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type='button'
            className='inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted/70 text-muted-foreground'
            aria-label='Add reaction'
          >
            <Smile className='w-3.5 h-3.5' />
          </button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-auto p-1'>
          <div className='flex gap-1'>
            {REACTION_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type='button'
                onClick={() => onToggle(emoji)}
                className='text-lg hover:bg-muted/60 rounded p-1 transition-colors'
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function RepliesSection({
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

  const startEdit = (id: number, content: string) => {
    setEditingId(id);
    setEditDraft(content);
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

      {expanded && (
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
                {r.authorId === userId && (
                  <span className='ml-auto flex gap-1'>
                    <button
                      type='button'
                      className='text-xs text-muted-foreground hover:text-foreground'
                      onClick={() => startEdit(r.id, r.content)}
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
                )}
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
      )}
    </div>
  );
}

export function CourseFeed({ courseId, isStudent }: CourseFeedProps) {
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;

  const { data: posts = [], isLoading, isError, refetch } = useCourseFeed(courseId);
  const createMutation = useCreateCoursePost(courseId);
  const updateMutation = useUpdateCoursePost(courseId);
  const deleteMutation = useDeleteCoursePost(courseId);
  const uploadAttachmentsMutation = useUploadCoursePostAttachments(courseId);
  const deleteAttachmentMutation = useDeleteCoursePostAttachment(courseId);
  const userName = (user?.full_name ?? user?.name ?? null) as string | null;
  const toggleReactionMutation = useToggleReaction(courseId, userId);

  const [filter, setFilter] = useState<FeedFilter>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CoursePost | null>(null);

  const filterCounts = useMemo(
    () => ({
      all: posts.length,
      important: posts.filter((p) => p.isImportant).length,
      attachments: posts.filter((p) => p.attachments.length > 0).length,
      auto: posts.filter((p) => p.source !== 'MANUAL').length
    }),
    [posts]
  );

  const filtered = posts.filter((p) => {
    if (filter === 'important' && !p.isImportant) return false;
    if (filter === 'attachments' && p.attachments.length === 0) return false;
    if (filter === 'auto' && p.source === 'MANUAL') return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = (values: CoursePostFormValues, pendingFiles: File[]) => {
    createMutation.mutate(
      { title: values.title, content: values.content, isImportant: values.isImportant },
      {
        onSuccess: (post) => {
          if (pendingFiles.length === 0) {
            setCreateOpen(false);
            return;
          }
          uploadAttachmentsMutation.mutate(
            { postId: post.id, files: pendingFiles },
            { onSettled: () => setCreateOpen(false) }
          );
        }
      }
    );
  };

  const handleUpdate = () => {
    if (!editing) return;
    updateMutation.mutate(
      {
        postId: editing.id,
        input: {
          title: editing.title,
          content: editing.content,
          isImportant: editing.isImportant,
          isPinned: editing.isPinned
        }
      },
      { onSuccess: () => setEditing(null) }
    );
  };

  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const handleDelete = (postId: number) => {
    const key = feedKeys.list(courseId);
    const snapshot = queryClient.getQueryData<CoursePost[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((p) => p.id === postId);
    if (!removed) return;
    runDelete({
      label: `Post deleted · "${removed.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<CoursePost[]>(key, (prev) =>
          (prev ?? []).filter((p) => p.id !== postId)
        );
      },
      restore: () => {
        queryClient.setQueryData<CoursePost[]>(key, () => snapshot);
      },
      commit: () => deleteCoursePost(postId)
    });
  };

  const onReact = (postId: number, emoji: string) => {
    toggleReactionMutation.mutate({ postId, emoji });
  };

  const feedDescription =
    posts.length === 0
      ? isStudent
        ? 'Course updates from your lecturer'
        : 'Course updates for your class'
      : `${filtered.length === posts.length ? posts.length : `${filtered.length} of ${posts.length}`} post${posts.length === 1 ? '' : 's'}`;

  const newPostAction = !isStudent ? (
    <Button size='sm' className='gap-1.5' onClick={() => setCreateOpen(true)}>
      <Plus className='size-4' aria-hidden />
      New post
    </Button>
  ) : undefined;

  return (
    <>
      <CoursePageShell title='Feed' description={feedDescription} actions={newPostAction}>
        <div className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative max-w-md flex-1'>
              <Search
                className='pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                aria-hidden
              />
              <Input
                placeholder='Search posts…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='h-9 pl-8'
                aria-label='Search posts'
              />
            </div>
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              ariaLabel='Filter posts'
              options={[
                { value: 'all', label: 'All', count: filterCounts.all },
                { value: 'important', label: 'Important', count: filterCounts.important },
                { value: 'attachments', label: 'Files', count: filterCounts.attachments },
                { value: 'auto', label: 'Updates', count: filterCounts.auto }
              ]}
              className='shrink-0'
            />
          </div>

          {isLoading && <ListSkeleton variant='card' count={3} />}
          {isError && (
            <QueryErrorState
              title='Could not load the feed'
              onRetry={() => void refetch()}
            />
          )}

          {!isLoading && !isError && filtered.length === 0 && posts.length === 0 && (
            <EmptyState
              icon={Megaphone}
              title='No posts yet'
              description={
                isStudent
                  ? 'Course updates from your lecturer will appear here.'
                  : 'Share an update, ask a question, or attach a file to start the conversation.'
              }
              actionLabel={isStudent ? undefined : 'New post'}
              onAction={isStudent ? undefined : () => setCreateOpen(true)}
            />
          )}

          {!isLoading && !isError && filtered.length === 0 && posts.length > 0 && (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              No posts match your search or filter.
            </p>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div className='space-y-3'>
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    'rounded-lg border border-border/60 bg-background p-4 transition-colors hover:bg-muted/20',
                    item.isImportant && 'border-l-2 border-l-destructive pl-[calc(1rem-2px)]',
                    item.isPinned && 'ring-1 ring-primary/15'
                  )}
                >
                  <div className='mb-2 flex items-start justify-between gap-3'>
                    <div className='min-w-0 flex flex-wrap items-center gap-2'>
                      {item.isPinned && (
                        <Pin className='size-3.5 shrink-0 text-primary' aria-label='Pinned' />
                      )}
                      <h3 className='font-medium leading-snug'>{item.title}</h3>
                      {item.isImportant && (
                        <Badge variant='destructive' className='text-[10px]'>
                          Important
                        </Badge>
                      )}
                      {item.source && item.source !== 'MANUAL' && (
                        <Badge variant='outline' className='gap-1 text-[10px]'>
                          <Bot className='size-3' aria-hidden />
                          {SOURCE_LABEL[item.source]}
                        </Badge>
                      )}
                    </div>
                    {item.authorId === userId && (
                      <div className='flex shrink-0 gap-0.5'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          onClick={() => setEditing(item)}
                          aria-label='Edit post'
                        >
                          <Edit className='size-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8 text-destructive'
                          onClick={() => handleDelete(item.id)}
                          aria-label='Delete post'
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className='mb-3 select-text whitespace-pre-wrap text-sm text-muted-foreground'>
                    {item.content}
                  </p>

                  <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
                    <Clock className='size-3 shrink-0' aria-hidden />
                    <span title={new Date(item.created_at).toLocaleString()}>
                      {format(new Date(item.created_at), 'MMM d, yyyy')}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{item.author?.full_name}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </p>

                  {item.attachments.length > 0 && (
                    <div className='mt-3 space-y-1.5'>
                      {item.attachments.map((file) => (
                        <div
                          key={file.id}
                          className='flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm'
                        >
                          <a
                            href={file.url}
                            target='_blank'
                            rel='noreferrer'
                            className='min-w-0 flex-1 truncate font-medium hover:underline'
                          >
                            {file.name}
                          </a>
                          {typeof file.size === 'number' && (
                            <span className='shrink-0 text-xs text-muted-foreground'>
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          )}
                          <a
                            href={file.url}
                            download={file.name}
                            className='shrink-0 text-muted-foreground hover:text-foreground'
                            title='Download'
                          >
                            <Download className='size-3.5' />
                          </a>
                          {item.authorId === userId && (
                            <button
                              type='button'
                              onClick={async () => {
                                if (!(await confirmDelete(file.name))) return;
                                deleteAttachmentMutation.mutate(file.id);
                              }}
                              className='shrink-0 text-muted-foreground hover:text-destructive'
                              title='Remove attachment'
                            >
                              <XIcon className='size-3.5' />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className='mt-3 border-t border-border/40 pt-3'>
                    <ReactionStrip
                      post={item}
                      userId={userId}
                      onToggle={(emoji) => onReact(item.id, emoji)}
                    />
                  </div>

                  <RepliesSection
                    post={item}
                    userId={userId}
                    userName={userName}
                    courseId={courseId}
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      </CoursePageShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <CoursePostForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitting={createMutation.isPending}
            uploading={uploadAttachmentsMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className='space-y-4 py-4'>
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder='Title'
              />
              <Textarea
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                rows={4}
              />
              <label className='flex items-center gap-2 text-sm'>
                <Checkbox
                  checked={editing.isImportant}
                  onCheckedChange={(v) => setEditing({ ...editing, isImportant: Boolean(v) })}
                />
                Mark as important
              </label>
              <label className='flex items-center gap-2 text-sm'>
                <Checkbox
                  checked={editing.isPinned}
                  onCheckedChange={(v) => setEditing({ ...editing, isPinned: Boolean(v) })}
                />
                Pin to top
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
