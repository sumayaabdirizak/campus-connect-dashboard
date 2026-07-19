'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Lock, Send, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pastelFor } from '@/lib/pastel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/auth-store';
import {
  useClaimOfficeThread,
  useOfficeThread,
  useSendOfficeMessage,
  useSetOfficeThreadStatus
} from '../api/office-queries';
import { StatusChip } from './office-bits';

interface OfficeThreadViewProps {
  threadId: number;
  onBack: () => void;
}

function messageTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function OfficeThreadView({ threadId, onBack }: OfficeThreadViewProps) {
  const { user } = useAuthStore();
  const myId = Number(user?.id ?? 0) || null;
  const { data: thread, isLoading } = useOfficeThread(threadId);
  const sendMutation = useSendOfficeMessage(threadId);
  const claimMutation = useClaimOfficeThread(threadId);
  const statusMutation = useSetOfficeThreadStatus(threadId);

  const [draft, setDraft] = useState('');
  const [internal, setInternal] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const messageCount = thread?.messages.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  if (isLoading && !thread) {
    return (
      <div className='space-y-3'>
        <Skeleton className='h-16 rounded-2xl' />
        <Skeleton className='h-72 rounded-2xl' />
      </div>
    );
  }
  if (!thread) {
    return <p className='py-12 text-center text-sm text-muted-foreground'>Conversation not found.</p>;
  }

  const hue = pastelFor(thread.office.slug);
  const resolved = thread.status === 'RESOLVED';
  const canSend = draft.trim().length > 0 && !sendMutation.isPending && (!resolved || thread.isStaff);

  const send = () => {
    if (!canSend) return;
    sendMutation.mutate(
      { content: draft.trim(), isInternalNote: thread.isStaff && internal },
      {
        onSuccess: () => {
          setDraft('');
          setInternal(false);
        },
        onError: (e) => toast.error(e.message)
      }
    );
  };

  return (
    <div className='flex h-full min-h-0 flex-col'>
      {/* Header */}
      <div className={cn('rounded-2xl px-4 py-3', hue.tile)}>
        <div className='flex flex-wrap items-center gap-2'>
          <Button variant='ghost' size='icon' className='size-8 shrink-0' onClick={onBack} aria-label='Back'>
            <ArrowLeft className={cn('size-4', hue.text)} />
          </Button>
          <div className='min-w-0 flex-1'>
            <p className={cn('truncate text-sm font-semibold', hue.text)}>{thread.topic}</p>
            <p className={cn('truncate text-[11px]', hue.subtext)}>
              {thread.office.name} · {thread.reference}
              {thread.isStaff && ` · from ${thread.student.full_name}`}
              {thread.assignedTo && ` · handled by ${thread.assignedTo.full_name}`}
            </p>
          </div>
          <StatusChip status={thread.status} />
          {thread.isStaff && (
            <div className='flex gap-1.5'>
              {!thread.assignedTo && (
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7 gap-1 bg-white/60 text-xs dark:bg-black/20'
                  onClick={() => claimMutation.mutate(undefined, { onError: (e) => toast.error(e.message) })}
                >
                  <UserCheck className='size-3.5' /> Claim
                </Button>
              )}
              <Button
                size='sm'
                variant='outline'
                className='h-7 gap-1 bg-white/60 text-xs dark:bg-black/20'
                onClick={() =>
                  statusMutation.mutate(resolved ? 'OPEN' : 'RESOLVED', {
                    onSuccess: () => toast.success(resolved ? 'Reopened' : 'Marked resolved'),
                    onError: (e) => toast.error(e.message)
                  })
                }
              >
                <CheckCircle2 className='size-3.5' /> {resolved ? 'Reopen' : 'Resolve'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className='mt-3 flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card p-4'>
        {thread.messages.map((m) => {
          const own = m.sender?.id === myId;
          const fromStudent = m.sender?.id === thread.student.id;
          return (
            <div key={m.id} className={cn('flex flex-col', own ? 'items-end' : 'items-start')}>
              <div className='mb-0.5 flex items-center gap-2 text-[11px] text-muted-foreground'>
                {!own && <span className='font-medium text-foreground'>{m.sender?.full_name ?? 'Staff'}</span>}
                <span>{messageTime(m.createdAt)}</span>
                {m.isInternalNote && (
                  <span className='inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'>
                    <Lock className='size-2.5' /> internal
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'w-fit max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.isInternalNote
                    ? 'border border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-500/10'
                    : own
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : fromStudent
                        ? 'rounded-bl-md bg-muted'
                        : cn('rounded-bl-md', hue.chip)
                )}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {resolved && !thread.isStaff ? (
        <p className='mt-3 rounded-2xl border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground'>
          This conversation is resolved — start a new one from the office page if you need more help.
        </p>
      ) : (
        <div className='mt-3 space-y-2'>
          <div className='flex items-end gap-2'>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={internal ? 'Internal note (student will not see this)…' : 'Write a message…'}
              className={cn(
                'max-h-36 min-h-11 flex-1 resize-none py-2.5',
                internal && 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-500/10'
              )}
            />
            <Button size='icon' onClick={send} disabled={!canSend} aria-label='Send'>
              {sendMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
            </Button>
          </div>
          {thread.isStaff && (
            <label className='flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground'>
              <Checkbox checked={internal} onCheckedChange={(v) => setInternal(v === true)} />
              Internal note (staff only)
            </label>
          )}
        </div>
      )}
    </div>
  );
}
