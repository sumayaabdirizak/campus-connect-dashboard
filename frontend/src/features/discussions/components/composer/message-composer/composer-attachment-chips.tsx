'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { PendingAttachment } from './types';

interface ComposerAttachmentChipsProps {
  attachments: PendingAttachment[];
  onRemove: (localId: string) => void;
}

export function ComposerAttachmentChips({
  attachments,
  onRemove
}: ComposerAttachmentChipsProps) {
  if (attachments.length === 0) return null;
  return (
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
            onClick={() => onRemove(a.localId)}
          >
            <Icons.close className='h-3 w-3' />
          </Button>
        </div>
      ))}
    </div>
  );
}
