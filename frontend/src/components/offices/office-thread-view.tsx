'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pastelFor } from '@/lib/pastel';
import { Button } from '@/features/ui/components/button';
import { Skeleton } from '@/features/ui/components/skeleton';
import { useAuthStore } from '@/lib/auth-store';
import { TypingIndicator } from '@/components/discussions/channel/typing-indicator';
// TODO: useOfficeThreadRoom not found in discussions/services - uncomment when implemented
// import { useOfficeThreadRoom } from '@/lib/discussions/services/use-discussion-room';
import { useOfficeThread, useSendOfficeMessage } from '@/lib/offices/queries';
import { useOfficeComposerTyping } from '@/lib/offices/services';
import { useOfficeThreadTyping } from '@/lib/offices/services';
import { StatusChip } from './office-bits';
import { OfficeThreadStaffActions } from './office-thread-staff-actions';
import { OfficeThreadMessages } from './office-thread-messages';
import { OfficeThreadComposer } from './office-thread-composer';
import { OfficeChatView } from './office-chat-view';

interface OfficeThreadViewProps {
  threadId: number;
  onBack: () => void;
}

export function OfficeThreadView({ threadId, onBack }: OfficeThreadViewProps) {
  const { user } = useAuthStore();
  const myId = Number(user?.id ?? 0) || null;
  const { data: thread, isLoading } = useOfficeThread(threadId);
  const sendMutation = useSendOfficeMessage(threadId);

  const [draft, setDraft] = useState('');
  const [internal, setInternal] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const messageCount = thread?.messages.length ?? 0;

  // TODO: useOfficeThreadRoom not found - uncomment when implemented
  // useOfficeThreadRoom(threadId);
  const typers = useOfficeThreadTyping(threadId, myId);
  const { noteTypingActivity, stopTyping } = useOfficeComposerTyping(threadId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  if (isLoading && !thread) {
    return (
      <div className='space-y-3 p-3 sm:p-4'>
        <Skeleton className='h-16 rounded-xl' />
        <Skeleton className='h-72 rounded-xl' />
      </div>
    );
  }
  if (!thread) {
    return (
      <p className='py-12 text-center text-sm text-muted-foreground'>Conversation not found.</p>
    );
  }

  if (thread.isOfficeToOffice) {
    return <OfficeChatView thread={thread} onBack={onBack} />;
  }

  const hue = pastelFor(thread.office.slug);
  const resolved = thread.status === 'RESOLVED';
  const canSend = draft.trim().length > 0 && !sendMutation.isPending && (!resolved || thread.isStaff);

  const send = () => {
    if (!canSend) return;
    stopTyping(true);
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
    <div className='flex h-full min-h-0 flex-col p-3 sm:p-4'>
      <div className={cn('rounded-xl px-4 py-3', hue.tile)}>
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
          <OfficeThreadStaffActions thread={thread} />
        </div>
      </div>

      <OfficeThreadMessages thread={thread} myId={myId} hue={hue} endRef={endRef} />

      <TypingIndicator typers={typers} />

      <OfficeThreadComposer
        thread={thread}
        draft={draft}
        setDraft={setDraft}
        internal={internal}
        setInternal={setInternal}
        canSend={canSend}
        sending={sendMutation.isPending}
        onSend={send}
        onTypingActivity={noteTypingActivity}
      />
    </div>
  );
}
