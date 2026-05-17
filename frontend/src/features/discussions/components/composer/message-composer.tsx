'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useChannelMembers, useSendChannelMessage } from '../../api/queries';
import { emitTypingStart, emitTypingStop } from '../../api/socket';
import { uploadDiscussionFile, type DiscussionUploadResult } from '../../discussion-upload';
import {
  hasQaSlashCommand,
  isDiscussionQaStyleChannel,
  stripQaSlashCommand
} from '../../discussion-qa';
import type { DiscussionPermissions } from '../../hooks/use-discussion-permissions';
import type { ChannelMember, DiscussionMessage } from '../../api/types';
import {
  MentionPopover,
  filterMentionCandidates,
  firstNameHandle
} from './mention-popover';

/** Look back from the caret for an open `@<query>` token (no spaces between
 *  the `@` and the caret). Returns null when the caret isn't in a mention
 *  position. The `@` must be preceded by start-of-string or whitespace. */
function detectMentionAtCaret(
  value: string,
  caret: number
): { query: string; start: number; end: number } | null {
  for (let i = caret; i > 0; i--) {
    const ch = value[i - 1];
    if (ch === '@') {
      const prev = value[i - 2];
      if (prev !== undefined && !/\s/.test(prev)) return null;
      const query = value.slice(i, caret);
      if (/\s/.test(query)) return null;
      return { query, start: i - 1, end: caret };
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}

const MAX_LINES = 10;

type PendingAttachment = {
  localId: string;
  file: File;
  progress: number;
  result: DiscussionUploadResult | null;
  error: string | null;
  abort: () => void;
};

export function MessageComposer({
  channelId,
  channelName,
  channelSlug,
  serverName,
  perms,
  e2eeEnabled,
  e2eeKeyVersion,
  parentMessageId,
  placeholder,
  myUserId,
  myDisplayName,
  onOptimisticInsert,
  onOptimisticReplace,
  onOptimisticRemove
}: {
  channelId: number;
  channelName?: string;
  channelSlug?: string;
  serverName?: string;
  perms: DiscussionPermissions;
  e2eeEnabled?: boolean;
  e2eeKeyVersion?: number;
  /** When set, posts as a reply in this thread root. */
  parentMessageId?: number;
  placeholder?: string;
  myUserId?: number | null;
  myDisplayName?: string | null;
  /** Optional optimistic-update API. When provided, the composer renders sent
   *  messages instantly with a temp negative id, then replaces with the real
   *  row on success or removes on error. */
  onOptimisticInsert?: (temp: DiscussionMessage) => void;
  onOptimisticReplace?: (tempId: number, real: DiscussionMessage) => void;
  onOptimisticRemove?: (tempId: number) => void;
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sendMutation = useSendChannelMessage(channelId);

  // ── Typing indicator emission ───────────────────────────────────────────
  // Throttle typing:start to once per 3s and auto-fire typing:stop after
  // 5s of keyboard idle. Mirrors Slack/Discord cadence and matches the
  // backend's freshness window (5s, see useChannelTyping).
  const lastStartEmittedAtRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const isTypingActiveRef = useRef(false);

  const stopTyping = (force = false) => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (!isTypingActiveRef.current && !force) return;
    isTypingActiveRef.current = false;
    lastStartEmittedAtRef.current = 0;
    if (!parentMessageId) {
      // Threads share the parent channel's typing room — emit channel stop.
      emitTypingStop({ channelId });
    }
  };

  const noteTypingActivity = () => {
    if (parentMessageId) return; // skip thread composer; less useful, more noise
    const now = Date.now();
    if (now - lastStartEmittedAtRef.current > 3_000) {
      lastStartEmittedAtRef.current = now;
      isTypingActiveRef.current = true;
      emitTypingStart({ channelId });
    }
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => stopTyping(), 5_000);
  };

  // Stop emitting on unmount or channel switch.
  useEffect(() => {
    return () => stopTyping(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // ── Mention popover state ───────────────────────────────────────────────
  const [mention, setMention] = useState<{
    query: string;
    start: number;
    end: number;
    selectedIndex: number;
  } | null>(null);
  const { data: membersData } = useChannelMembers(channelId);
  const members = useMemo(() => membersData?.results ?? [], [membersData]);
  const mentionCandidates = useMemo(
    () =>
      mention
        ? filterMentionCandidates(members, mention.query, myUserId ?? null)
        : [],
    [members, mention, myUserId]
  );

  /** Re-evaluate whether the popover should be open after the textarea
   *  content or caret moves. */
  const refreshMentionState = (
    nextValue: string,
    caret: number
  ) => {
    const detected = detectMentionAtCaret(nextValue, caret);
    if (!detected) {
      setMention(null);
      return;
    }
    setMention((prev) => ({
      query: detected.query,
      start: detected.start,
      end: detected.end,
      // Reset selection when the query changes; preserve when only the caret
      // shifted (rare since we rebuild on every change).
      selectedIndex: prev?.query === detected.query ? prev.selectedIndex : 0
    }));
  };

  const insertMention = (member: ChannelMember) => {
    if (!mention) return;
    const handle =
      firstNameHandle(member.user?.full_name) ||
      member.user?.number ||
      String(member.userId);
    const insertion = `@${handle} `;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.end);
    const next = `${before}${insertion}${after}`;
    setValue(next);
    setMention(null);
    // Restore caret right after the inserted handle.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const newCaret = before.length + insertion.length;
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    });
  };

  // ── Q&A: channel detection + composer toggles ───────────────────────────
  const isQaChannel = useMemo(
    () => isDiscussionQaStyleChannel(serverName ?? '', channelName ?? '', channelSlug),
    [serverName, channelName, channelSlug]
  );
  // Replies cannot be questions or anonymous (backend rule).
  const isThreadReply = parentMessageId != null;
  const [askAsQuestion, setAskAsQuestion] = useState(false);
  const [postAnonymously, setPostAnonymously] = useState(false);

  // Slash command parser: typing `/qa ...` flips the question toggle on.
  const slashActive = !isThreadReply && hasQaSlashCommand(value);
  const effectiveAskAsQuestion = !isThreadReply && (askAsQuestion || slashActive);
  const effectivePostAnonymously =
    effectiveAskAsQuestion && isQaChannel && postAnonymously;

  // Auto-grow up to MAX_LINES.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
    const max = lineHeight * MAX_LINES;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value]);

  const allAttachmentsReady = attachments.every((a) => a.result != null);
  const hasReadyAttachments = attachments.some((a) => a.result != null);
  const canSend =
    perms.canSend && (value.trim().length > 0 || hasReadyAttachments) && allAttachmentsReady;

  const reset = () => {
    setValue('');
    setAttachments([]);
  };

  const handleSubmit = () => {
    if (!canSend || sendMutation.isPending) return;
    // The user has clearly stopped typing now that they've hit send.
    stopTyping();
    // If the user typed `/qa ...`, strip the prefix before sending.
    const stripped = slashActive ? stripQaSlashCommand(value) : value;
    const trimmed = stripped.trim();
    const attachmentIds = attachments
      .map((a) => a.result?.id)
      .filter((id): id is number => typeof id === 'number');

    const messageType: 'QUESTION' | 'MEDIA' | 'TEXT' = effectiveAskAsQuestion
      ? 'QUESTION'
      : trimmed.length === 0 && attachmentIds.length > 0
        ? 'MEDIA'
        : 'TEXT';

    // Optimistic insert — only when the parent provided the API (channel
    // composer in main list does, thread composer doesn't yet).
    const useOptimism =
      !!onOptimisticInsert && !!onOptimisticReplace && !!onOptimisticRemove;
    const tempId = useOptimism ? -Date.now() : null;
    if (useOptimism && tempId != null) {
      const linkedAttachments = attachments
        .filter((a) => a.result != null)
        .map((a) => ({
          id: a.result!.id,
          fileType: a.result!.fileType,
          mimeType: a.result!.mimeType,
          size: Number(a.result!.size),
          isE2EE: a.result!.isE2EE
        }));
      const temp: DiscussionMessage = {
        id: tempId,
        channelId,
        groupDmId: null,
        senderId: myUserId ?? null,
        content: trimmed || null,
        messageType,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        parentMessageId: parentMessageId ?? null,
        isAnonymous: effectivePostAnonymously,
        sender: myUserId
          ? { id: myUserId, full_name: myDisplayName ?? '' }
          : null,
        attachments: linkedAttachments,
        reactions: []
      };
      onOptimisticInsert!(temp);
    }

    // Reset the input as soon as we've staged the optimistic message —
    // it feels instant to the user even if the server takes 300ms.
    const wasUsingOptimism = useOptimism;
    if (wasUsingOptimism) {
      reset();
      setAskAsQuestion(false);
      setPostAnonymously(false);
    }

    sendMutation.mutate(
      {
        content: trimmed || null,
        attachmentIds,
        messageType,
        postAsQuestion: effectiveAskAsQuestion || undefined,
        isAnonymous: effectivePostAnonymously || undefined,
        ...(parentMessageId ? { parentMessageId } : {})
      },
      {
        onSuccess: (result) => {
          if (wasUsingOptimism && tempId != null) {
            const realMessage =
              (result as { message?: DiscussionMessage })?.message ?? null;
            if (realMessage) {
              onOptimisticReplace!(tempId, realMessage);
            } else {
              // Server didn't return the row in the expected shape — drop
              // the temp; the socket echo will deliver the real one.
              onOptimisticRemove!(tempId);
            }
          } else {
            reset();
            setAskAsQuestion(false);
            setPostAnonymously(false);
          }
        },
        onError: () => {
          if (wasUsingOptimism && tempId != null) {
            onOptimisticRemove!(tempId);
            // Restore the user's draft so they can retry without retyping.
            setValue(value);
          }
        }
      }
    );
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    // Mention popover takes precedence over send when it's open.
    if (mention && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMention((m) =>
          m
            ? {
                ...m,
                selectedIndex:
                  (m.selectedIndex + 1) % mentionCandidates.length
              }
            : m
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMention((m) =>
          m
            ? {
                ...m,
                selectedIndex:
                  (m.selectedIndex - 1 + mentionCandidates.length) %
                  mentionCandidates.length
              }
            : m
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const target = mentionCandidates[mention.selectedIndex];
        if (target) insertMention(target);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!perms.canAttachFiles) {
      toast.error('You don’t have permission to attach files in this channel');
      return;
    }
    Array.from(files).forEach((file) => {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const upload = uploadDiscussionFile({
        file,
        channelId,
        keyVersion: e2eeKeyVersion ?? 1,
        requireE2eeMetadata: !!e2eeEnabled,
        onProgress: (percent) => {
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, progress: percent } : a))
          );
        }
      });
      setAttachments((prev) => [
        ...prev,
        { localId, file, progress: 0, result: null, error: null, abort: upload.abort }
      ]);
      void upload.promise
        .then((result) => {
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, result, progress: 100 } : a))
          );
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, error: msg } : a))
          );
          toast.error(`Upload failed: ${file.name}`, { description: msg });
        });
    });
  };

  const removeAttachment = (localId: string) => {
    const target = attachments.find((a) => a.localId === localId);
    if (target && !target.result) target.abort();
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  if (!perms.canSend) {
    return (
      <div className='border-t bg-muted/40 px-6 py-3 text-center text-xs text-muted-foreground'>
        You don’t have permission to send messages in this channel.
      </div>
    );
  }

  const composerPlaceholder =
    placeholder ??
    (effectiveAskAsQuestion
      ? effectivePostAnonymously
        ? 'Ask a question anonymously…'
        : 'Ask a question…'
      : isQaChannel
        ? 'Ask a question (or share an update)…'
        : channelName
          ? `Message #${channelName}`
          : 'Send a message');

  return (
    <div className='border-t bg-background px-4 py-3'>
      {(effectiveAskAsQuestion || effectivePostAnonymously) && (
        <div className='mb-2 flex flex-wrap items-center gap-1.5'>
          {effectiveAskAsQuestion && (
            <span className='inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300'>
              <Icons.help className='h-3 w-3' />
              Posting as Question
            </span>
          )}
          {effectivePostAnonymously && (
            <span className='inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300'>
              <Icons.user className='h-3 w-3' />
              Anonymous
            </span>
          )}
          {slashActive && (
            <span className='text-[10px] text-muted-foreground'>
              triggered by <code className='rounded bg-muted px-1 font-mono'>/qa</code>
            </span>
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <div className='mb-2 flex flex-wrap gap-2'>
          {attachments.map((a) => (
            <div
              key={a.localId}
              className={cn(
                'flex max-w-xs items-center gap-2 rounded-md border bg-muted/60 px-2 py-1 text-xs',
                a.error && 'border-destructive/60 bg-destructive/10'
              )}
            >
              <Icons.paperclip className='h-3.5 w-3.5 shrink-0 opacity-70' />
              <span className='min-w-0 flex-1 truncate'>{a.file.name}</span>
              {a.error ? (
                <span className='text-destructive'>error</span>
              ) : a.result ? (
                <Icons.check className='h-3.5 w-3.5 text-emerald-500' />
              ) : (
                <span className='tabular-nums text-muted-foreground'>{a.progress}%</span>
              )}
              <Button
                variant='ghost'
                size='icon'
                className='h-5 w-5'
                aria-label={`Remove ${a.file.name}`}
                onClick={() => removeAttachment(a.localId)}
              >
                <Icons.close className='h-3 w-3' />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-end gap-2 rounded-lg border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/40'>
        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {perms.canAttachFiles && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 shrink-0'
            aria-label='Attach files'
            onClick={() => fileInputRef.current?.click()}
          >
            <Icons.paperclip className='h-4 w-4' />
          </Button>
        )}

        {!isThreadReply && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className={cn(
                  'h-8 w-8 shrink-0',
                  effectiveAskAsQuestion &&
                    'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300'
                )}
                aria-label={effectiveAskAsQuestion ? 'Post as normal message' : 'Post as question'}
                aria-pressed={effectiveAskAsQuestion}
                onClick={() => {
                  if (slashActive) {
                    // Slash command is the source of truth — strip it instead of toggling.
                    setValue(stripQaSlashCommand(value));
                    setAskAsQuestion(false);
                  } else {
                    setAskAsQuestion((v) => !v);
                  }
                }}
              >
                <Icons.help className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='top'>
              {effectiveAskAsQuestion ? 'Posting as question — click to undo' : 'Post as question (or type /qa)'}
            </TooltipContent>
          </Tooltip>
        )}

        {!isThreadReply && isQaChannel && effectiveAskAsQuestion && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className={cn(
                  'h-8 w-8 shrink-0',
                  effectivePostAnonymously &&
                    'bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:text-violet-300'
                )}
                aria-label={effectivePostAnonymously ? 'Reveal your name' : 'Post anonymously'}
                aria-pressed={effectivePostAnonymously}
                onClick={() => setPostAnonymously((v) => !v)}
              >
                <Icons.user className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='top'>
              {effectivePostAnonymously ? 'Anonymous — instructors can still see who you are' : 'Post anonymously'}
            </TooltipContent>
          </Tooltip>
        )}

        <div className='relative flex-1'>
          {mention && mentionCandidates.length > 0 && (
            <MentionPopover
              members={mentionCandidates}
              query={mention.query}
              selectedIndex={Math.min(
                mention.selectedIndex,
                mentionCandidates.length - 1
              )}
              onHover={(index) =>
                setMention((m) => (m ? { ...m, selectedIndex: index } : m))
              }
              onSelect={insertMention}
            />
          )}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              setValue(next);
              refreshMentionState(next, e.target.selectionStart ?? next.length);
              if (next.trim().length > 0) noteTypingActivity();
              else stopTyping();
            }}
            onSelect={(e) => {
              const t = e.currentTarget;
              refreshMentionState(t.value, t.selectionStart ?? t.value.length);
            }}
            onBlur={() => {
              // Close the popover on blur — but with a slight delay so a
              // click on a popover row can still register.
              window.setTimeout(() => setMention(null), 100);
            }}
            onKeyDown={handleKeyDown}
            placeholder={composerPlaceholder}
            rows={1}
            className='min-h-[36px] resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0'
          />
        </div>

        <Button
          type='button'
          size='icon'
          className='h-8 w-8 shrink-0'
          aria-label='Send message'
          onClick={handleSubmit}
          disabled={!canSend || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <Icons.spinner className='h-4 w-4 animate-spin' />
          ) : (
            <Icons.send className='h-4 w-4' />
          )}
        </Button>
      </div>

      <p className='mt-1 px-1 text-[10px] text-muted-foreground'>
        Enter to send · Shift+Enter for newline
        {!isThreadReply && (
          <>
            {' · '}
            <code className='rounded bg-muted px-1 font-mono'>/qa</code> to ask a question
          </>
        )}
      </p>
    </div>
  );
}
