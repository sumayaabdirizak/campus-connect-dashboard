'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useMyOfficeThreads, useOffices, useStartOfficeThread } from '../../api/office-queries';
import type { SupportOffice } from '../../api/office-types';
import { OfficeGrid } from './office-grid';
import { MyConversationsList } from './my-conversations-list';
import { StartOfficeDialog } from './start-office-dialog';

interface OfficeDirectoryProps {
  onOpenThread: (id: number) => void;
  onOpenInbox: (slug: string) => void;
}

export function OfficeDirectory({ onOpenThread, onOpenInbox }: OfficeDirectoryProps) {
  const { data: offices = [], isLoading: officesLoading } = useOffices();
  const { data: myThreads = [], isLoading: threadsLoading } = useMyOfficeThreads();
  const startMutation = useStartOfficeThread();

  const [target, setTarget] = useState<SupportOffice | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  const start = () => {
    if (!target) return;
    if (!topic.trim() || !message.trim()) {
      toast.error('Add a topic and your message first');
      return;
    }
    startMutation.mutate(
      { slug: target.slug, topic: topic.trim(), message: message.trim() },
      {
        onSuccess: (thread) => {
          toast.success(`Sent to ${target.name} · ref ${thread.reference}`);
          setTarget(null);
          setTopic('');
          setMessage('');
          onOpenThread(thread.id);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className='space-y-8'>
      <section>
        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          University offices
        </h2>
        <OfficeGrid
          offices={offices}
          loading={officesLoading}
          onMessage={setTarget}
          onOpenInbox={onOpenInbox}
        />
      </section>

      <section>
        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          My conversations
        </h2>
        <MyConversationsList
          threads={myThreads}
          loading={threadsLoading}
          onOpenThread={onOpenThread}
        />
      </section>

      <StartOfficeDialog
        target={target}
        topic={topic}
        message={message}
        pending={startMutation.isPending}
        onTopicChange={setTopic}
        onMessageChange={setMessage}
        onClose={() => setTarget(null)}
        onSend={start}
      />
    </div>
  );
}
