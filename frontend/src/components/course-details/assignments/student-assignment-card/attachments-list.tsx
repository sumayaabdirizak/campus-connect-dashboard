'use client';

import { Download, Paperclip } from 'lucide-react';
import { attachmentDownloadUrl } from '@/lib/course-details/services/assignments-service';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { formatFileSize } from './helpers';

export function AssignmentAttachments({
  attachments,
}: {
  attachments: NonNullable<Assignment['attachments']>;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className='mt-2 space-y-1'>
      {attachments.map((att) => (
        <div
          key={att.id}
          className='flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1'
        >
          <Paperclip className='w-3 h-3 text-muted-foreground shrink-0' />
          <a
            href={att.url}
            target='_blank'
            rel='noreferrer'
            className='truncate flex-1 hover:underline'
          >
            {att.name}
          </a>
          {typeof att.size === 'number' ? (
            <span className='text-muted-foreground shrink-0'>
              {formatFileSize(att.size)}
            </span>
          ) : null}
          <a
            href={attachmentDownloadUrl(att.id)}
            className='inline-flex items-center gap-1 text-muted-foreground hover:text-foreground shrink-0'
            title='Download'
          >
            <Download className='w-3 h-3' />
          </a>
        </div>
      ))}
    </div>
  );
}
