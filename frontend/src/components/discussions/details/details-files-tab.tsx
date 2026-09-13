'use client';

import { Paperclip, Search } from 'lucide-react';
import { Input } from '@/features/ui/components/input';
import { fileNameFromUrl } from './details-helpers';
import type { AggregatedAttachment } from './attachment-row';

export function DetailsFilesTab({
  attachments,
  attachmentSearch,
  onAttachmentSearchChange,
}: {
  attachments: AggregatedAttachment[];
  attachmentSearch: string;
  onAttachmentSearchChange: (value: string) => void;
}) {
  return (
    <div className='p-3'>
      <div className='relative mb-3'>
        <Search className='absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={attachmentSearch}
          onChange={(e) => onAttachmentSearchChange(e.target.value)}
          placeholder='Search files…'
          className='h-8 rounded-full border-0 bg-muted/60 pl-8 text-xs focus-visible:ring-1'
        />
      </div>
      {attachments.length === 0 ? (
        <div className='flex flex-col items-center gap-2 py-10 text-center'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-muted'>
            <Paperclip className='h-5 w-5 text-muted-foreground/50' />
          </div>
          <p className='text-xs text-muted-foreground'>
            {attachmentSearch ? 'No matching files.' : 'No files shared yet.'}
          </p>
        </div>
      ) : (
        <div className='space-y-1'>
          {attachments.map((row, i) => (
            <a
              key={`${row.messageId}-${i}`}
              href={row.attachment.accessUrl ?? row.attachment.url}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs hover:bg-muted transition-colors'
            >
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
                <Paperclip className='h-3.5 w-3.5 text-muted-foreground' />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate font-medium text-foreground'>
                  {fileNameFromUrl(row.attachment.url)}
                </p>
                <p className='truncate text-[10px] text-muted-foreground'>{row.senderName}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
