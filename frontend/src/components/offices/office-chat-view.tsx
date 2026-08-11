'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/features/ui/components/button';
import { Textarea } from '@/features/ui/components/textarea';
import { useAuthStore } from '@/lib/auth-store';
import { TypingIndicator } from '@/components/discussions/channel/typing-indicator';
// TODO: useOfficeThreadRoom not found in discussions/services - uncomment when implemented
// import { useOfficeThreadRoom } from '@/lib/discussions/services/use-discussion-room';
import { useSendOfficeMessage } from '@/lib/offices/queries';
import type { OfficeThreadDetail } from '@/lib/offices/types';
import { useOfficeComposerTyping } from '@/lib/offices/services';
import { useOfficeThreadTyping } from '@/lib/offices/services';
import { OfficeChatMessages } from './office-chat-messages';

type Props = {
  thread: OfficeThreadDetail;
  onBack?: () => void;
};

/** Office ↔ office Messages pane (bubbles + composer, no ticket chrome). */
export function OfficeChatView({ thread, onBack }: Props) {
  const myId = Number(useAuthStore((s) => s.user?.id) ?? 0) || null;
  const sendMutation = useSendOfficeMessage(thread.id);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const messageCount = thread.messages.length;

  const typers = useOfficeThreadTyping(thread.id, myId);
  const { noteTypingActivity, stopTyping } = useOfficeComposerTyping(thread.id);

  // TODO: useOfficeThreadRoom not found - uncomment when implemented
  // useOfficeThreadRoom(thread.id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  const canSend = draft.trim().length > 0 && !sendMutation.isPending;
  const peerLabel =
    myId === thread.studentId
      ? thread.office.name
      : thread.student.full_name || 'Academic Office';

  function send() {
    if (!canSend) return;
    stopTyping(true);
    sendMutation.mutate(
      { content: draft.trim(), isInternalNote: false },
      {
        onSuccess: () => setDraft(''),
        onError: (e) => toast.error(e.message),
      }
    );
  }

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F8FAFC]'>
      <div className='shrink-0 border-b border-[#E5E7EB] bg-white px-4 py-3'>
        <div className='flex items-center gap-3'>
          <span className='bg-muted flex size-10 shrink-0 items-center justify-center rounded-full'>
            <Building2 className='size-5' />
          </span>
          <div className='min-w-0 flex-1'>
            <h2 className='truncate text-base font-semibold text-[#101828]'>{peerLabel}</h2>
            <p className='text-muted-foreground text-xs'>Direct message</p>
          </div>
          {onBack ? (
            <button type='button' className='text-muted-foreground text-xs underline' onClick={onBack}>
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className='min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3'>
        <OfficeChatMessages
          messages={thread.messages}
          myId={myId}
          peerLabel={peerLabel}
          endRef={endRef}
        />
      </div>

      <TypingIndicator typers={typers} />

      <div className='shrink-0 border-t border-[#E5E7EB] bg-white p-3'>
        <div className='flex items-end gap-2'>
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              noteTypingActivity();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${peerLabel}…`}
            className='max-h-36 min-h-11 flex-1 resize-none py-2.5'
            maxLength={5000}
          />
          <Button size='icon' onClick={send} disabled={!canSend} aria-label='Send'>
            {sendMutation.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Send className='size-4' />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
