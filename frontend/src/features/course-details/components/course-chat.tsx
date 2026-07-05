'use client';

import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatBytes } from '@/lib/utils';
import { ListSkeleton } from './_shared/list-skeleton';
import {
  ChevronDown,
  CornerUpLeft,
  Download,
  Loader2,
  MessagesSquare,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { avatarGradient } from '@/features/discussions/utils/avatar-color';
import { useAuthStore } from '@/lib/auth-store';
import {
  chatKeys,
  useChatRoom,
  useEditChatMessage,
  useLoadOlderMessages,
  useSendChatMessage,
  useUploadChatAttachments
} from '../api/chat-queries';
import { useCourseChat } from '../api/use-chat-socket';
import { useRoster } from '../api/roster-queries';
import type { ChatMessage, ChatRoom } from '../api/chat-types';
import { deleteChatMessage as deleteChatMessageCall } from '../api/chat-service';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { useQueryClient } from '@/lib/async-query';
import { showToast } from '@/lib/notifications';

interface CourseChatProps {
  courseId: string;
  isStudent?: boolean;
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

function messageTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "Today" / "Yesterday" / a short date for the day-divider pills. */
function dayLabel(value: string): string {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
  });
}

/**
 * Flattens the message list into a render plan that interleaves day-divider
 * pills and an optional "new messages" separator, so the JSX stays a simple
 * map instead of tracking day boundaries inline.
 */
type ChatRenderItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'unread'; key: string }
  | { kind: 'message'; key: string; message: ChatMessage };

function buildRenderPlan(messages: ChatMessage[], firstUnreadId: number | null): ChatRenderItem[] {
  const plan: ChatRenderItem[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const day = new Date(message.created_at).toDateString();
    if (day !== lastDay) {
      plan.push({ kind: 'day', key: `day-${day}`, label: dayLabel(message.created_at) });
      lastDay = day;
    }
    if (firstUnreadId != null && message.id === firstUnreadId) {
      plan.push({ kind: 'unread', key: 'unread-divider' });
    }
    plan.push({ kind: 'message', key: `m-${message.id}`, message });
  }
  return plan;
}

function MessageContent({
  content,
  mentionLabels,
  meSlug,
  isOwn
}: {
  content: string;
  mentionLabels: Map<string, string>;
  meSlug: string | null;
  isOwn: boolean;
}) {
  const parts = content.split(/(@[a-z0-9][\w.\-]{0,40})/gi);

  return (
    <>
      {parts.map((part, index) => {
        if (!part.startsWith('@')) return <span key={`${part}-${index}`}>{part}</span>;

        const token = part.slice(1).toLowerCase();
        const label = mentionLabels.get(token);
        const mine = meSlug === token;

        // Always render a chip for an @handle — fall back to the raw token when
        // the name isn't in the roster (typed by hand, or the person left the
        // course). Contrast is tuned per bubble: white-on-blue inside our own
        // primary bubble, primary-tinted inside the muted bubbles of others.
        return (
          <span
            key={`${part}-${index}`}
            className={cn(
              'rounded px-1 font-medium',
              isOwn
                ? 'bg-white/25 text-primary-foreground'
                : mine
                  ? 'bg-primary/25 text-primary'
                  : 'bg-primary/10 text-primary'
            )}
          >
            @{label ?? part.slice(1)}
          </span>
        );
      })}
    </>
  );
}

export function CourseChat({ courseId }: CourseChatProps) {
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;
  const meSlug = useMemo(
    () => (user?.full_name || user?.name ? slugifyName(String(user.full_name ?? user.name)) : null),
    [user]
  );

  const { data: chatRoom, isLoading } = useChatRoom(courseId);
  const { data: roster = [] } = useRoster(courseId);
  const loadOlder = useLoadOlderMessages(courseId);
  const sendViaHttp = useSendChatMessage(courseId);
  const editMutation = useEditChatMessage(courseId);
  const uploadMutation = useUploadChatAttachments(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();
  const {
    messages: liveMessages,
    sendMessage: sendViaSocket,
    isConnected,
    presence,
    typing,
    emitTyping,
    liveDeletedIds,
    liveUpdated
  } = useCourseChat(courseId);

  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [mentionPicker, setMentionPicker] = useState<{
    open: boolean;
    candidates: { id: number; full_name: string; slug: string }[];
  }>({ open: false, candidates: [] });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevLenRef = useRef(0);

  // Scroll position bookkeeping: whether we're pinned to the bottom, how many
  // messages have arrived while scrolled away, and which message id marks the
  // top of that unread run (drives the "new messages" divider).
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [firstUnreadId, setFirstUnreadId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setNewCount(0);
    setFirstUnreadId(null);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(bottom);
    if (bottom) {
      setNewCount(0);
      setFirstUnreadId(null);
    }
  };

  /** Scroll a referenced message into view and flash it (jump-to-reply). */
  const jumpToMessage = (id: number) => {
    const node = messageRefs.current.get(id);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 1600);
  };

  const mentionLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const person of roster) labels.set(slugifyName(person.full_name), person.full_name);
    return labels;
  }, [roster]);

  const allMessages = useMemo(() => {
    const persisted = chatRoom?.messages ?? [];
    const seen = new Set(persisted.map((item) => item.id));
    const liveOnly = liveMessages.filter((item) => !seen.has(item.id));

    return [...persisted, ...liveOnly]
      .map((item) => liveUpdated.get(item.id) ?? item)
      .filter((item) => !liveDeletedIds.has(item.id))
      .sort((a, b) => a.id - b.id);
  }, [chatRoom, liveMessages, liveDeletedIds, liveUpdated]);

  // Smart auto-scroll: only follow new messages when the reader is already at
  // the bottom or it's their own message. Otherwise keep their scroll position
  // and surface a "new messages" count + divider instead of yanking them down.
  useEffect(() => {
    const prevLen = prevLenRef.current;
    const nextLen = allMessages.length;
    prevLenRef.current = nextLen;
    if (nextLen === 0) return;

    const added = nextLen - prevLen;
    const last = allMessages[nextLen - 1];
    const lastIsMine = last?.senderId === userId;

    if (prevLen === 0) {
      // First load — jump straight to the latest without animation.
      scrollToBottom('auto');
      return;
    }

    if (added > 0 && (atBottom || lastIsMine)) {
      scrollToBottom('smooth');
    } else if (added > 0) {
      setNewCount((count) => count + added);
      setFirstUnreadId((current) => current ?? allMessages[Math.max(0, prevLen)]?.id ?? null);
    }
  }, [allMessages, userId, atBottom]);

  // Follow typing indicators only while pinned to the bottom.
  useEffect(() => {
    if (atBottom && typing.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [typing.length, atBottom]);

  const clearComposer = () => {
    setMessage('');
    setReplyTo(null);
    setMentionPicker({ open: false, candidates: [] });
    emitTyping('stop');
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    emitTyping(value.trim() ? 'start' : 'stop');

    const match = /@([a-z0-9.\-]*)$/i.exec(value);
    if (!match) {
      setMentionPicker({ open: false, candidates: [] });
      return;
    }

    const query = match[1].toLowerCase();
    const candidates = roster
      .map((person) => ({ id: person.id, full_name: person.full_name, slug: slugifyName(person.full_name) }))
      .filter((person) => person.slug.startsWith(query))
      .slice(0, 50);
    setMentionPicker({ open: candidates.length > 0, candidates });
  };

  const insertMention = (slug: string) => {
    setMessage((current) => current.replace(/@([a-z0-9.\-]*)$/i, `@${slug} `));
    setMentionPicker({ open: false, candidates: [] });
    composerRef.current?.focus();
  };

  const sendText = (text: string, replyToId: number | null) => {
    if (isConnected) {
      sendViaSocket(text, replyToId);
      return;
    }
    sendViaHttp.mutate({ content: text, replyToId });
  };

  const handleSend = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !user) return;

    sendText(trimmed, replyTo?.id ?? null);
    clearComposer();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const startEdit = (item: ChatMessage) => {
    setEditingId(item.id);
    setEditDraft(item.content);
  };

  const saveEdit = () => {
    const trimmed = editDraft.trim();
    if (editingId == null || !trimmed) return;
    editMutation.mutate(
      { messageId: editingId, content: trimmed },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const undoDeleteMessage = (item: ChatMessage) => {
    const key = chatKeys.room(courseId);
    const snapshot = queryClient.getQueryData<ChatRoom>(key);
    if (!snapshot) return;

    const preview = item.content.length > 40 ? `${item.content.slice(0, 40)}...` : item.content;
    runDelete({
      label: `Message deleted - "${preview}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<ChatRoom>(key, (previous) =>
          previous ? { ...previous, messages: previous.messages.filter((messageItem) => messageItem.id !== item.id) } : previous!
        );
      },
      restore: () => queryClient.setQueryData<ChatRoom>(key, () => snapshot),
      commit: () => deleteChatMessageCall(item.id)
    });
  };

  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const oversized = files.find((file) => file.size > 10 * 1024 * 1024);
    if (oversized) {
      showToast('warning', 'File too large', `"${oversized.name}" exceeds the 10 MB limit`);
      return;
    }

    const content = message.trim() || `Shared ${files.length} file${files.length === 1 ? '' : 's'}`;
    const replyToId = replyTo?.id ?? null;

    sendViaHttp.mutate(
      { content, replyToId },
      {
        onSuccess: (created) => {
          uploadMutation.mutate({ messageId: created.id, files });
        }
      }
    );
    clearComposer();
  };

  if (isLoading && !chatRoom) {
    return (
      <div className='h-[560px] rounded-xl border bg-background p-4 shadow-sm'>
        <ListSkeleton variant='row' count={7} />
      </div>
    );
  }

  return (
    <section className='overflow-hidden rounded-xl border bg-background shadow-sm'>
      <div className='border-b bg-muted/20 px-4 py-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='min-w-0'>
            <h3 className='truncate text-base font-semibold'>{chatRoom?.name || 'Course Chat'}</h3>
            <p className='text-xs text-muted-foreground'>
              {allMessages.length} message{allMessages.length === 1 ? '' : 's'} · {presence.length} online
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {presence.length > 0 && (
              <div className='flex -space-x-2'>
                {presence.slice(0, 5).map((person) => (
                  <Avatar key={person.userId} title={`${person.full_name} online`} className='size-8 ring-2 ring-emerald-500'>
                    <AvatarFallback
                      className='text-[11px] font-semibold text-white'
                      style={{ background: avatarGradient(person.full_name) }}
                    >
                      {initialsOf(person.full_name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {presence.length > 5 && (
                  <span className='inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold ring-2 ring-background'>
                    +{presence.length - 5}
                  </span>
                )}
              </div>
            )}

            <Badge variant={isConnected ? 'default' : 'secondary'} className={cn(isConnected && 'bg-emerald-600 text-white hover:bg-emerald-600')}>
              {isConnected ? <Wifi className='mr-1 size-3' /> : <WifiOff className='mr-1 size-3' />}
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </div>
      </div>

      <div className='relative'>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className='h-[500px] overflow-y-auto bg-muted/40 px-4 py-4'
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in oklch, var(--muted-foreground) 14%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      >
        {chatRoom?.hasMore && chatRoom?.nextCursor && (
          <div className='mb-4 flex justify-center'>
            <Button
              variant='outline'
              size='sm'
              disabled={loadOlder.isPending}
              onClick={() => loadOlder.mutate(chatRoom.nextCursor!)}
            >
              {loadOlder.isPending && <Loader2 className='mr-2 size-3 animate-spin' />}
              Load older
            </Button>
          </div>
        )}

        {allMessages.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-3 text-center'>
            <div className='flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm'>
              <MessagesSquare className='size-7' />
            </div>
            <div>
              <p className='font-medium'>No messages yet</p>
              <p className='text-sm text-muted-foreground'>
                Say hello — start the conversation for this course.
              </p>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {buildRenderPlan(allMessages, firstUnreadId).map((entry) => {
              if (entry.kind === 'day') {
                return (
                  <div key={entry.key} className='sticky top-0 z-10 flex justify-center py-1'>
                    <span className='rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur'>
                      {entry.label}
                    </span>
                  </div>
                );
              }
              if (entry.kind === 'unread') {
                return (
                  <div key={entry.key} className='flex items-center gap-2 py-1'>
                    <span className='h-px flex-1 bg-primary/40' />
                    <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                      New messages
                    </span>
                    <span className='h-px flex-1 bg-primary/40' />
                  </div>
                );
              }

              const item = entry.message;
              const isOwn = item.senderId === userId;
              const iWasMentioned = userId != null && item.mentions.some((mention) => mention.userId === userId);

              return (
                <div
                  key={item.id}
                  ref={(node) => {
                    if (node) messageRefs.current.set(item.id, node);
                    else messageRefs.current.delete(item.id);
                  }}
                  className={cn(
                    'group flex items-end gap-2 rounded-xl transition-colors',
                    isOwn && 'flex-row-reverse',
                    flashId === item.id && 'bg-primary/10 ring-2 ring-primary/40'
                  )}
                >
                  <Avatar className='size-8'>
                    <AvatarFallback
                      className='text-[11px] font-semibold text-white'
                      style={{ background: avatarGradient(item.sender.full_name) }}
                    >
                      {initialsOf(item.sender.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={cn(
                      'flex min-w-0 max-w-[78%] flex-col gap-1',
                      isOwn ? 'items-end' : 'items-start'
                    )}
                  >
                    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', isOwn && 'justify-end')}>
                      {!isOwn && <span className='font-medium text-foreground'>{item.sender.full_name}</span>}
                      <span>{messageTime(item.created_at)}</span>
                      {item.editedAt && <span>edited</span>}
                    </div>

                    {item.replyTo && (
                      <button
                        type='button'
                        onClick={() => item.replyTo && jumpToMessage(item.replyTo.id)}
                        title='Jump to message'
                        className={cn(
                          'mb-1 block w-full max-w-sm cursor-pointer rounded-md border-l-2 bg-muted/50 px-3 py-2 text-left text-xs transition-colors hover:bg-muted',
                          isOwn ? 'border-primary/50' : 'border-primary'
                        )}
                      >
                        <span className='block font-medium'>{item.replyTo.sender.full_name}</span>
                        <span className='block truncate text-muted-foreground'>{item.replyTo.content}</span>
                      </button>
                    )}

                    {editingId === item.id ? (
                      <div className='min-w-[260px] space-y-2'>
                        <Textarea
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          className='min-h-20 resize-none text-sm'
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') setEditingId(null);
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              saveEdit();
                            }
                          }}
                        />
                        <div className='flex justify-end gap-2'>
                          <Button type='button' size='sm' variant='ghost' onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                          <Button type='button' size='sm' onClick={saveEdit} disabled={editMutation.isPending}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'select-text w-fit max-w-full rounded-2xl px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
                          isOwn ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted',
                          iWasMentioned && !isOwn && 'bg-primary/15 ring-1 ring-primary/30'
                        )}
                      >
                        <MessageContent
                          content={item.content}
                          mentionLabels={mentionLabels}
                          meSlug={meSlug}
                          isOwn={isOwn}
                        />
                      </div>
                    )}

                    {item.attachments.length > 0 && (
                      <div className={cn('mt-2 flex flex-col gap-1', isOwn && 'items-end')}>
                        {item.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target='_blank'
                            rel='noreferrer'
                            download={attachment.name}
                            className='inline-flex max-w-[260px] items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-xs shadow-sm hover:bg-muted/40'
                          >
                            <Paperclip className='size-3.5 shrink-0' />
                            <span className='min-w-0 flex-1 truncate'>{attachment.name}</span>
                            {typeof attachment.size === 'number' && (
                              <span className='shrink-0 text-muted-foreground'>{formatBytes(attachment.size, { decimals: 1 })}</span>
                            )}
                            <Download className='size-3.5 shrink-0' />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className={cn('mt-1 flex items-center gap-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100', isOwn && 'justify-end')}>
                      <button type='button' className='hover:text-foreground' onClick={() => setReplyTo(item)}>
                        Reply
                      </button>
                      {isOwn && (
                        <>
                          <button type='button' className='inline-flex items-center gap-1 hover:text-foreground' onClick={() => startEdit(item)}>
                            <Pencil className='size-3' />
                            Edit
                          </button>
                          <button type='button' className='inline-flex items-center gap-1 hover:text-destructive' onClick={() => undoDeleteMessage(item)}>
                            <Trash2 className='size-3' />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

        {/* Jump-to-latest pill — appears whenever the reader has scrolled up. */}
        {!atBottom && (
          <button
            type='button'
            onClick={() => scrollToBottom('smooth')}
            className='absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105'
          >
            <ChevronDown className='size-4' />
            {newCount > 0 ? `${newCount} new message${newCount === 1 ? '' : 's'}` : 'Jump to latest'}
          </button>
        )}
      </div>

      {typing.length > 0 && (
        <div className='border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground'>
          {typing.length === 1
            ? `${typing[0].full_name} is typing...`
            : typing.length === 2
              ? `${typing[0].full_name} and ${typing[1].full_name} are typing...`
              : `${typing.length} people are typing...`}
        </div>
      )}

      {replyTo && (
        <div className='flex items-start justify-between gap-3 border-t bg-muted/30 px-4 py-3'>
          <div className='flex min-w-0 items-start gap-2'>
            <CornerUpLeft className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
            <div className='min-w-0'>
              <p className='text-xs font-medium'>Replying to {replyTo.sender.full_name}</p>
              <p className='truncate text-xs text-muted-foreground'>{replyTo.content}</p>
            </div>
          </div>
          <Button type='button' variant='ghost' size='icon' className='size-7 shrink-0' onClick={() => setReplyTo(null)}>
            <X className='size-4' />
          </Button>
        </div>
      )}

      <form onSubmit={handleSend} className='relative border-t p-4'>
        {mentionPicker.open && (
          <div className='absolute bottom-full left-4 right-4 mb-2 max-h-56 overflow-y-auto overscroll-contain rounded-lg border bg-background shadow-lg'>
            {mentionPicker.candidates.map((candidate) => (
              <button
                key={candidate.id}
                type='button'
                onClick={() => insertMention(candidate.slug)}
                className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60'
              >
                <Avatar className='size-7'>
                  <AvatarFallback
                    className='text-[10px] font-semibold text-white'
                    style={{ background: avatarGradient(candidate.full_name) }}
                  >
                    {initialsOf(candidate.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className='min-w-0 flex-1 truncate'>{candidate.full_name}</span>
              </button>
            ))}
          </div>
        )}

        <div className='flex items-end gap-2'>
          <input ref={fileInputRef} type='file' multiple onChange={pickFiles} className='hidden' />
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={() => fileInputRef.current?.click()}
            disabled={sendViaHttp.isPending || uploadMutation.isPending}
            title='Attach files'
          >
            {uploadMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : <Paperclip className='size-4' />}
          </Button>

          <Textarea
            ref={composerRef}
            value={message}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            onBlur={() => emitTyping('stop')}
            placeholder={replyTo ? 'Write your reply...' : 'Message this course...'}
            className='max-h-36 min-h-11 flex-1 resize-none py-2.5'
          />

          <Button type='submit' size='icon' disabled={!message.trim() || sendViaHttp.isPending}>
            {sendViaHttp.isPending ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
          </Button>
        </div>
      </form>
    </section>
  );
}
