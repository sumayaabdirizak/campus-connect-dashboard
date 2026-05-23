'use client';

import { useRef, useState } from 'react';
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
  Paperclip,
  X as XIcon,
  Download,
  MessageSquare,
  Smile,
  Megaphone
} from 'lucide-react';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
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
import { useAuthStore } from '@/lib/auth-store';
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
}

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
                      onClick={() => {
                        if (confirm('Delete this reply?')) deleteMutation.mutate(r.id);
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
                <p className='text-sm whitespace-pre-wrap'>{r.content}</p>
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

export function CourseFeed({ courseId }: CourseFeedProps) {
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;

  const { data: posts = [], isLoading, isError } = useCourseFeed(courseId);
  const createMutation = useCreateCoursePost(courseId);
  const updateMutation = useUpdateCoursePost(courseId);
  const deleteMutation = useDeleteCoursePost(courseId);
  const uploadAttachmentsMutation = useUploadCoursePostAttachments(courseId);
  const deleteAttachmentMutation = useDeleteCoursePostAttachment(courseId);
  const userName = (user?.full_name ?? user?.name ?? null) as string | null;
  const toggleReactionMutation = useToggleReaction(courseId, userId);

  const [filter, setFilter] = useState<'all' | 'important' | 'attachments' | 'auto'>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImportant, setNewImportant] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<CoursePost | null>(null);

  const filtered = posts.filter((p) => {
    if (filter === 'important' && !p.isImportant) return false;
    if (filter === 'attachments' && p.attachments.length === 0) return false;
    if (filter === 'auto' && p.source === 'MANUAL') return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resetCreateForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewImportant(false);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const oversized = list.find((f) => f.size > 25 * 1024 * 1024);
    if (oversized) {
      alert(`"${oversized.name}" exceeds 25 MB`);
      e.target.value = '';
      return;
    }
    setPendingFiles((prev) => [...prev, ...list]);
    e.target.value = '';
  };

  const removePending = (i: number) =>
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    createMutation.mutate(
      { title: newTitle.trim(), content: newContent.trim(), isImportant: newImportant },
      {
        onSuccess: (post) => {
          if (pendingFiles.length === 0) {
            setCreateOpen(false);
            resetCreateForm();
            return;
          }
          uploadAttachmentsMutation.mutate(
            { postId: post.id, files: pendingFiles },
            {
              onSettled: () => {
                setCreateOpen(false);
                resetCreateForm();
              }
            }
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

  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-10'
          />
        </div>
        <div className='flex gap-1 p-1 bg-muted/30 rounded-lg'>
          {(['all', 'important', 'attachments', 'auto'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md ${filter === f ? 'bg-background shadow-sm' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreateOpen(true)} size='sm' className='gap-1'>
          <Plus className='w-4 h-4' /> New Post
        </Button>
      </div>

      {isLoading && <ListSkeleton variant='card' count={3} />}
      {isError && (
        <p className='text-sm text-destructive'>Failed to load the feed.</p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title='No posts yet'
          description='Share an update, ask a question, or attach a file to start the conversation.'
          actionLabel='New post'
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className='space-y-2'>
        {filtered.map((item) => (
          <div key={item.id} className='border rounded-lg p-4 hover:bg-muted/10'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2 flex-wrap'>
                {item.isPinned && <Pin className='w-3 h-3 text-muted-foreground' />}
                <span className='font-medium'>{item.title}</span>
                {item.isImportant && (
                  <Badge variant='destructive' className='text-[10px]'>
                    Important
                  </Badge>
                )}
                {item.source && item.source !== 'MANUAL' && (
                  <Badge variant='outline' className='text-[10px] gap-1'>
                    <Bot className='w-3 h-3' />
                    {SOURCE_LABEL[item.source]}
                  </Badge>
                )}
              </div>
              {item.authorId === userId && (
                <div className='flex gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setEditing(item)}
                  >
                    <Edit className='w-4 h-4' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-destructive'
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              )}
            </div>

            <p className='text-sm text-muted-foreground mb-2 whitespace-pre-wrap'>
              {item.content}
            </p>

            <p className='text-xs text-muted-foreground flex items-center gap-2'>
              <Clock className='w-3 h-3' />
              <span title={new Date(item.created_at).toLocaleString()}>
                {format(new Date(item.created_at), 'MMM d, yyyy')}
              </span>
              <span>·</span>
              <span>{item.author?.full_name}</span>
            </p>

            {item.attachments.length > 0 && (
              <div className='mt-2 space-y-1'>
                {item.attachments.map((file) => (
                  <div
                    key={file.id}
                    className='flex items-center justify-between p-2 bg-muted/30 rounded text-sm'
                  >
                    <a
                      href={file.url}
                      target='_blank'
                      rel='noreferrer'
                      className='font-medium truncate flex-1 hover:underline'
                    >
                      {file.name}
                    </a>
                    {typeof file.size === 'number' && (
                      <span className='text-xs text-muted-foreground mx-2'>
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                    <a
                      href={file.url}
                      download={file.name}
                      className='text-muted-foreground hover:text-foreground shrink-0'
                      title='Download'
                    >
                      <Download className='w-3.5 h-3.5' />
                    </a>
                    {item.authorId === userId && (
                      <button
                        type='button'
                        onClick={() => {
                          if (confirm(`Remove ${file.name}?`)) {
                            deleteAttachmentMutation.mutate(file.id);
                          }
                        }}
                        className='ml-2 text-muted-foreground hover:text-destructive shrink-0'
                        title='Remove attachment'
                      >
                        <XIcon className='w-3.5 h-3.5' />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className='mt-3'>
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
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder='Title'
            />
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder='Content'
              rows={4}
            />
            <div className='space-y-2'>
              <input
                ref={fileInputRef}
                type='file'
                multiple
                onChange={pickFiles}
                className='hidden'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='gap-1 w-full'
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className='w-4 h-4' /> Attach files
              </Button>
              {pendingFiles.length > 0 && (
                <ul className='space-y-1'>
                  {pendingFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className='flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1'
                    >
                      <span className='truncate'>
                        {f.name}{' '}
                        <span className='text-muted-foreground'>
                          ({(f.size / 1024).toFixed(1)} KB)
                        </span>
                      </span>
                      <button
                        type='button'
                        onClick={() => removePending(i)}
                        className='text-muted-foreground hover:text-destructive'
                      >
                        <XIcon className='w-3.5 h-3.5' />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className='text-[10px] text-muted-foreground'>Up to 10 files, 25 MB each.</p>
            </div>
            <label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={newImportant}
                onCheckedChange={(v) => setNewImportant(Boolean(v))}
              />
              Mark as important
            </label>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                uploadAttachmentsMutation.isPending ||
                !newTitle.trim() ||
                !newContent.trim()
              }
            >
              {createMutation.isPending
                ? 'Posting…'
                : uploadAttachmentsMutation.isPending
                  ? 'Uploading…'
                  : 'Post'}
            </Button>
          </DialogFooter>
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
    </div>
  );
}
