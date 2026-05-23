'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CornerUpLeft,
  Send,
  Wifi,
  WifiOff,
  X,
  Paperclip,
  Pencil,
  Trash2,
  Download
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  chatKeys,
  useChatRoom,
  useDeleteChatMessage,
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
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/// Renders message content with @-mention tokens highlighted. The model emits
/// raw text — we recognise `@firstname.lastname` patterns and resolve them
/// against the roster for display.
function MessageContent({
  content,
  mentionSlugs,
  meSlug
}: {
  content: string;
  mentionSlugs: Set<string>;
  meSlug: string | null;
}) {
  const parts = content.split(/(@[a-z0-9][\w.\-]{0,40})/gi);
  return (
    <>
      {parts.map((p, i) => {
        if (!p.startsWith('@')) return <span key={i}>{p}</span>;
        const token = p.slice(1).toLowerCase();
        const known = mentionSlugs.has(token);
        const mine = meSlug && token === meSlug;
        if (!known) return <span key={i}>{p}</span>;
        return (
          <span
            key={i}
            className={`rounded px-1 ${mine ? 'bg-primary/20 text-primary font-medium' : 'bg-primary/10 text-primary'}`}
          >
            {p}
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
    () =>
      user?.full_name || user?.name
        ? slugifyName(String(user?.full_name ?? user?.name))
        : null,
    [user]
  );

  const { data: chatRoom, isLoading } = useChatRoom(courseId);
  const loadOlder = useLoadOlderMessages(courseId);
  const sendViaHttp = useSendChatMessage(courseId);
  const editMutation = useEditChatMessage(courseId);
  const deleteMutation = useDeleteChatMessage(courseId);
  const uploadMutation = useUploadChatAttachments(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const undoDeleteMessage = (msg: ChatMessage) => {
    const key = chatKeys.room(courseId);
    const snapshot = queryClient.getQueryData<ChatRoom>(key);
    if (!snapshot) return;
    const preview =
      msg.content.length > 40 ? `${msg.content.slice(0, 40)}…` : msg.content;
    runDelete({
      label: `Message deleted · "${preview}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<ChatRoom>(key, (prev) =>
          prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== msg.id) } : prev!
        );
      },
      restore: () => queryClient.setQueryData<ChatRoom>(key, () => snapshot),
      commit: () => deleteChatMessageCall(msg.id)
    });
  };
  const { data: roster = [] } = useRoster(courseId);

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

  // Roster-derived slug set so the renderer knows which `@…` tokens are real.
  const mentionSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const s of roster) set.add(slugifyName(s.full_name));
    return set;
  }, [roster]);

  // Compose source-of-truth message list: persisted + live, dedup'd, with
  // any in-session edits/deletes applied.
  const allMessages = useMemo(() => {
    const persisted = chatRoom?.messages ?? [];
    const seen = new Set(persisted.map((m) => m.id));
    const liveOnly = liveMessages.filter((m) => !seen.has(m.id));
    const combined = [...persisted, ...liveOnly]
      .map((m) => liveUpdated.get(m.id) ?? m)
      .filter((m) => !liveDeletedIds.has(m.id));
    return combined;
  }, [chatRoom, liveMessages, liveDeletedIds, liveUpdated]);

  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [mentionPicker, setMentionPicker] = useState<{
    open: boolean;
    query: string;
    candidates: { id: number; full_name: string; slug: string }[];
  }>({ open: false, query: '', candidates: [] });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, typing.length]);

  // Watch for `@` mention triggers — popup shows matching roster names.
  const handleInputChange = (val: string) => {
    setMessage(val);
    emitTyping(val.length > 0 ? 'start' : 'stop');

    // Find the @-token under the cursor (last @-prefixed run).
    const match = /@([a-z0-9.\-]*)$/i.exec(val);
    if (!match) {
      setMentionPicker((p) => ({ ...p, open: false }));
      return;
    }
    const query = match[1].toLowerCase();
    const candidates = roster
      .filter((s) => slugifyName(s.full_name).startsWith(query))
      .slice(0, 5)
      .map((s) => ({ id: s.id, full_name: s.full_name, slug: slugifyName(s.full_name) }));
    setMentionPicker({ open: candidates.length > 0, query, candidates });
  };

  const insertMention = (slug: string) => {
    setMessage((prev) => prev.replace(/@([a-z0-9.\-]*)$/i, `@${slug} `));
    setMentionPicker({ open: false, query: '', candidates: [] });
    inputRef.current?.focus();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    const replyId = replyTo?.id ?? null;
    if (isConnected) {
      sendViaSocket(message, replyId);
    } else {
      sendViaHttp.mutate({ content: message, replyToId: replyId });
    }
    emitTyping('stop');
    setMessage('');
    setReplyTo(null);
    setMentionPicker({ open: false, query: '', candidates: [] });
  };

  const startEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditDraft(m.content);
  };

  const saveEdit = () => {
    if (editingId == null || !editDraft.trim()) return;
    editMutation.mutate(
      { messageId: editingId, content: editDraft.trim() },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const oversized = files.find((f) => f.size > 10 * 1024 * 1024);
    if (oversized) {
      alert(`"${oversized.name}" exceeds the 10 MB limit`);
      return;
    }
    // Two-step: send a placeholder text message via the HTTP path (so we get a
    // canonical id), then attach files to it.
    sendViaHttp.mutate(
      { content: '📎 shared a file', replyToId: replyTo?.id ?? null },
      {
        onSuccess: (msg) => {
          uploadMutation.mutate({ messageId: msg.id, files });
        }
      }
    );
    setReplyTo(null);
  };

  if (isLoading && !chatRoom) {
    return (
      <div className='border rounded-lg h-[400px] flex items-center justify-center'>Loading...</div>
    );
  }

  return (
    <div className='border rounded-lg overflow-hidden'>
      <div className='p-3 border-b flex items-center justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <h3 className='font-medium'>{chatRoom?.name || 'Course Chat'}</h3>
          <p className='text-xs text-muted-foreground'>{allMessages.length} messages</p>
        </div>
        {presence.length > 0 && (
          <div className='flex -space-x-2'>
            {presence.slice(0, 5).map((p) => (
              <span
                key={p.userId}
                title={`${p.full_name} · online`}
                className='inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium ring-2 ring-background'
              >
                {initialsOf(p.full_name)}
              </span>
            ))}
            {presence.length > 5 && (
              <span className='inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-medium ring-2 ring-background'>
                +{presence.length - 5}
              </span>
            )}
          </div>
        )}
        <div className='flex items-center gap-1 text-xs'>
          {isConnected ? (
            <Badge className='bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'>
              <Wifi className='w-3 h-3 mr-1' />
              Live
            </Badge>
          ) : (
            <Badge variant='secondary'>
              <WifiOff className='w-3 h-3 mr-1' />
              Offline
            </Badge>
          )}
        </div>
      </div>

      <div className='h-[350px] overflow-y-auto p-4 space-y-3'>
        {chatRoom?.hasMore && chatRoom?.nextCursor && (
          <div className='flex justify-center'>
            <Button
              variant='ghost'
              size='sm'
              disabled={loadOlder.isPending}
              onClick={() => loadOlder.mutate(chatRoom.nextCursor!)}
            >
              {loadOlder.isPending ? 'Loading…' : 'Load older messages'}
            </Button>
          </div>
        )}

        {allMessages.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground text-sm'>No messages yet</div>
        ) : (
          allMessages.map((msg) => {
            const isOwn = msg.senderId === userId;
            const iWasMentioned =
              userId != null && msg.mentions.some((m) => m.userId === userId);
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} group`}>
                <span
                  className='inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-medium shrink-0'
                  title={msg.sender.full_name}
                >
                  {initialsOf(msg.sender.full_name)}
                </span>
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  {!isOwn && <p className='text-xs font-medium mb-1'>{msg.sender.full_name}</p>}
                  {msg.replyTo && (
                    <div
                      className={`text-xs border-l-2 px-2 py-1 mb-1 bg-muted/40 rounded ${
                        isOwn ? 'border-primary-foreground/40' : 'border-primary'
                      }`}
                    >
                      <p className='font-medium'>{msg.replyTo.sender.full_name}</p>
                      <p className='truncate opacity-80'>{msg.replyTo.content}</p>
                    </div>
                  )}
                  {editingId === msg.id ? (
                    <div className='flex flex-col gap-1'>
                      <Input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className='h-8 text-sm'
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit();
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                      />
                      <div className='flex gap-1 justify-end'>
                        <Button size='sm' variant='ghost' onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button size='sm' onClick={saveEdit} disabled={editMutation.isPending}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`inline-block p-2 rounded-lg text-sm ${
                        iWasMentioned && !isOwn
                          ? 'bg-primary/20 ring-1 ring-primary/40'
                          : isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                      }`}
                    >
                      <MessageContent
                        content={msg.content}
                        mentionSlugs={mentionSlugs}
                        meSlug={meSlug}
                      />
                    </div>
                  )}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className='mt-1 space-y-1'>
                      {msg.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target='_blank'
                          rel='noreferrer'
                          download={a.name}
                          className='inline-flex items-center gap-1 text-xs border rounded px-2 py-1 hover:bg-muted/40'
                        >
                          <Paperclip className='w-3 h-3' />
                          <span className='truncate max-w-[200px]'>{a.name}</span>
                          {typeof a.size === 'number' && (
                            <span className='text-muted-foreground'>
                              ({(a.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                          <Download className='w-3 h-3 ml-1' />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className='flex items-center gap-2 mt-1 text-xs text-muted-foreground'>
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {msg.editedAt && <span>· edited</span>}
                    <button
                      type='button'
                      className='opacity-0 group-hover:opacity-100 hover:underline'
                      onClick={() => setReplyTo(msg)}
                    >
                      Reply
                    </button>
                    {isOwn && (
                      <>
                        <button
                          type='button'
                          className='opacity-0 group-hover:opacity-100 hover:underline inline-flex items-center gap-1'
                          onClick={() => startEdit(msg)}
                        >
                          <Pencil className='w-3 h-3' /> Edit
                        </button>
                        <button
                          type='button'
                          className='opacity-0 group-hover:opacity-100 hover:underline inline-flex items-center gap-1 text-destructive'
                          onClick={() => undoDeleteMessage(msg)}
                        >
                          <Trash2 className='w-3 h-3' /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {typing.length > 0 && (
        <div className='px-3 py-1 text-xs text-muted-foreground border-t bg-muted/20'>
          {typing.length === 1
            ? `${typing[0].full_name} is typing…`
            : typing.length === 2
              ? `${typing[0].full_name} and ${typing[1].full_name} are typing…`
              : `${typing.length} people are typing…`}
        </div>
      )}

      {replyTo && (
        <div className='px-3 py-2 border-t bg-muted/30 flex items-start justify-between gap-2'>
          <div className='flex items-start gap-2 min-w-0'>
            <CornerUpLeft className='w-3.5 h-3.5 mt-0.5 text-muted-foreground' />
            <div className='min-w-0'>
              <p className='text-xs font-medium'>Replying to {replyTo.sender.full_name}</p>
              <p className='text-xs text-muted-foreground truncate'>{replyTo.content}</p>
            </div>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={() => setReplyTo(null)}
          >
            <X className='w-3.5 h-3.5' />
          </Button>
        </div>
      )}

      <form onSubmit={handleSend} className='p-3 border-t relative'>
        {mentionPicker.open && (
          <div className='absolute bottom-full left-3 right-3 mb-1 border bg-background rounded shadow-md overflow-hidden text-sm'>
            {mentionPicker.candidates.map((c) => (
              <button
                key={c.id}
                type='button'
                onClick={() => insertMention(c.slug)}
                className='w-full text-left px-3 py-1.5 hover:bg-muted/60 flex items-center gap-2'
              >
                <span className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-medium'>
                  {initialsOf(c.full_name)}
                </span>
                <span>{c.full_name}</span>
                <span className='text-xs text-muted-foreground ml-auto'>@{c.slug}</span>
              </button>
            ))}
          </div>
        )}
        <div className='flex gap-2'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            onChange={pickFiles}
            className='hidden'
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || sendViaHttp.isPending}
            title='Attach files'
          >
            <Paperclip className='w-4 h-4' />
          </Button>
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={replyTo ? 'Write your reply...' : 'Type a message — use @ to mention…'}
            className='flex-1'
            onBlur={() => emitTyping('stop')}
          />
          <Button type='submit' size='icon' disabled={!message.trim()}>
            <Send className='w-4 h-4' />
          </Button>
        </div>
      </form>
    </div>
  );
}
