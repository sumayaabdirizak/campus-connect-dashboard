'use client';

import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { useQueryClient } from '@/lib/async-query';
import { inboxKeys } from '@/lib/inbox/inbox-queries';
import { messagesOfficeThreadHref } from '@/lib/inbox/services/messages-href';
import { useOffices, useStartOfficeThread } from '@/lib/offices/queries';
import type { SupportOffice } from '@/lib/offices/types';
import { StartOfficeDialog } from '@/components/offices/office-directory/start-office-dialog';

export function MessagesContactOffice({
  open,
  onOpenChange,
  onOpened
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened?: (href: string) => void;
}) {
  const qc = useQueryClient();
  const { data: offices = [], isLoading } = useOffices();
  const startMutation = useStartOfficeThread();
  const [target, setTarget] = useState<SupportOffice | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  const sortedOffices = offices
    .filter((o) => !o.myStaffRole)
    .toSorted((a, b) => {
      const aFac = a.facultyId == null ? 0 : 1;
      const bFac = b.facultyId == null ? 0 : 1;
      if (aFac !== bFac) return aFac - bFac;
      return a.name.localeCompare(b.name);
    });

  function resetCompose() {
    setTarget(null);
    setTopic('');
    setMessage('');
  }

  function closeAll() {
    resetCompose();
    onOpenChange(false);
  }

  function send() {
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
          void qc.invalidateQueries({ queryKey: inboxKeys.all });
          const href = messagesOfficeThreadHref(thread.id);
          closeAll();
          onOpened?.(href);
        },
        onError: (e) => toast.error(e.message)
      }
    );
  }

  return (
    <>
      <Dialog
        open={open && target === null}
        onOpenChange={(next) => {
          if (!next) closeAll();
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Contact an office</DialogTitle>
            <DialogDescription>
              Choose an office. Your message opens in Chats like a normal conversation.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className='flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground'>
              <Loader2 className='size-4 animate-spin' /> Loading offices…
            </div>
          ) : sortedOffices.length === 0 ? (
            <p className='text-muted-foreground py-6 text-center text-sm'>
              No offices are set up yet.
            </p>
          ) : (
            <ul className='max-h-72 space-y-1 overflow-y-auto'>
              {sortedOffices.map((office) => (
                <li key={office.id}>
                  <button
                    type='button'
                    className='hover:bg-muted flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors'
                    onClick={() => setTarget(office)}
                  >
                    <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg'>
                      <Building2 className='size-4' />
                    </span>
                    <span className='min-w-0'>
                      <span className='block truncate text-sm font-medium'>{office.name}</span>
                      <span className='text-muted-foreground line-clamp-2 text-xs'>
                        {office.faculty
                          ? `Faculty · ${office.faculty.name}`
                          : office.description || `Prefix ${office.codePrefix}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <StartOfficeDialog
        target={target}
        topic={topic}
        message={message}
        pending={startMutation.isPending}
        onTopicChange={setTopic}
        onMessageChange={setMessage}
        onClose={resetCompose}
        onSend={send}
      />
    </>
  );
}
