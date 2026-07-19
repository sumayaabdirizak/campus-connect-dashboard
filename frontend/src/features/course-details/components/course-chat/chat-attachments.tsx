'use client';

import { Download, Paperclip } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import type { ChatMessage } from '../../api/chat-types';
import { cn } from '@/lib/utils';

interface ChatAttachmentsProps {
  attachments: ChatMessage['attachments'];
  isOwn: boolean;
}

export function ChatAttachments({ attachments, isOwn }: ChatAttachmentsProps) {
  if (attachments.length === 0) return null;
  return (
    <div className={cn('mt-2 flex flex-col gap-1', isOwn && 'items-end')}>
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target='_blank'
          rel='noreferrer'
          download={attachment.name}
          className='inline-flex max-w-[260px] items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-xs shadow-sm hover:bg-muted/40'
        >
          <Paperclip className='size-3.5 shrink-0' />
          <span className='min-w-0 flex-1 truncate'>{attachment.name}</span>
          {typeof attachment.size === 'number' ? (
            <span className='shrink-0 text-muted-foreground'>
              {formatBytes(attachment.size, { decimals: 1 })}
            </span>
          ) : null}
          <Download className='size-3.5 shrink-0' />
        </a>
      ))}
    </div>
  );
}
