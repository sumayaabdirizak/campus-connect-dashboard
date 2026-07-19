'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SupportOffice } from '../../api/office-types';

const SUGGESTED_TOPICS = [
  'Transcript request',
  'Exam remark',
  'Registration issue',
  'Fee question',
  'Other',
];

export function StartOfficeDialog({
  target,
  topic,
  message,
  pending,
  onTopicChange,
  onMessageChange,
  onClose,
  onSend,
}: {
  target: SupportOffice | null;
  topic: string;
  message: string;
  pending: boolean;
  onTopicChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  onClose: () => void;
  onSend: () => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {target?.name}</DialogTitle>
          <DialogDescription>
            You&apos;ll get a reference number and any staff member of the office can reply.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <Label>Topic</Label>
            <Input
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder='e.g. Exam remark for CS102'
              maxLength={120}
            />
            <div className='flex flex-wrap gap-1.5 pt-1'>
              {SUGGESTED_TOPICS.map((s) => (
                <button
                  key={s}
                  type='button'
                  onClick={() => onTopicChange(s)}
                  className='rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Your message</Label>
            <Textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder='Describe your request with any relevant details…'
              className='min-h-28'
              maxLength={5000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSend} disabled={pending} className='gap-1.5'>
            {pending && <Loader2 className='size-4 animate-spin' />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
