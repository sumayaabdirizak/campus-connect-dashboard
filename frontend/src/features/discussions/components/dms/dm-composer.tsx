'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useSendGroupDmMessage } from '../../api/queries';
import { emitTypingStart, emitTypingStop } from '../../api/socket';
import type { DiscussionMessage } from '../../api/types';

const MAX_LINES = 10;

/**
 * Slim composer for group DMs. No Q&A toggles, no attachments yet (the
 * upload endpoint is channel-scoped — we'd need a backend extension to
 * support DM-scoped uploads), no slash commands.
 */
export function DmComposer({
  groupDmId,
  canPost,
  placeholder,
  myUserId,
  myDisplayName,
  onOptimisticInsert,
  onOptimisticReplace,
  onOptimisticRemove
}: {
  groupDmId: number;
  canPost: boolean;
  placeholder?: string;
  myUserId?: number | null;
  myDisplayName?: string | null;
  onOptimisticInsert?: (temp: DiscussionMessage) => void;
  onOptimisticReplace?: (tempId: number, real: DiscussionMessage) => void;
  onOptimisticRemove?: (tempId: number) => void;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendMutation = useSendGroupDmMessage(groupDmId);

  // Throttled typing emission — same cadence as MessageComposer (3s
  // re-emit threshold, 5s idle stop, force-stop on unmount or dm switch).
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
    emitTypingStop({ groupDmId });
  };

  const noteTypingActivity = () => {
    const now = Date.now();
    if (now - lastStartEmittedAtRef.current > 3_000) {
      lastStartEmittedAtRef.current = now;
      isTypingActiveRef.current = true;
      emitTypingStart({ groupDmId });
    }
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => stopTyping(), 5_000);
  };

  useEffect(() => {
    return () => stopTyping(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDmId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
    const max = lineHeight * MAX_LINES;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value]);

  const canSend = canPost && value.trim().length > 0;

  const handleSubmit = () => {
    if (!canSend || sendMutation.isPending) return;
    stopTyping();
    const trimmed = value.trim();

    const useOptimism =
      !!onOptimisticInsert && !!onOptimisticReplace && !!onOptimisticRemove;
    const tempId = useOptimism ? -Date.now() : null;
    if (useOptimism && tempId != null) {
      const temp: DiscussionMessage = {
        id: tempId,
        channelId: null,
        groupDmId,
        senderId: myUserId ?? null,
        content: trimmed,
        messageType: 'TEXT',
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        parentMessageId: null,
        sender: myUserId
          ? { id: myUserId, full_name: myDisplayName ?? '' }
          : null,
        attachments: [],
        reactions: []
      };
      onOptimisticInsert!(temp);
      setValue('');
    }

    sendMutation.mutate(
      { content: trimmed, messageType: 'TEXT' },
      {
        onSuccess: (result) => {
          if (useOptimism && tempId != null) {
            const real =
              (result as { message?: DiscussionMessage })?.message ?? null;
            if (real) onOptimisticReplace!(tempId, real);
            else onOptimisticRemove!(tempId);
          } else {
            setValue('');
          }
        },
        onError: () => {
          if (useOptimism && tempId != null) {
            onOptimisticRemove!(tempId);
            setValue(trimmed); // restore so the user can retry
          }
        }
      }
    );
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!canPost) {
    return (
      <div className='border-t bg-muted/40 px-6 py-3 text-center text-xs text-muted-foreground'>
        You can’t send messages in this conversation.
      </div>
    );
  }

  return (
    <div className='border-t bg-background px-4 py-3'>
      <div className='flex items-end gap-2 rounded-lg border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/40'>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            if (next.trim().length > 0) noteTypingActivity();
            else stopTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Send a message'}
          rows={1}
          className={cn(
            'min-h-[36px] resize-none border-0 bg-transparent px-2 py-1.5 shadow-none',
            'focus-visible:ring-0'
          )}
        />
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
      </p>
    </div>
  );
}
