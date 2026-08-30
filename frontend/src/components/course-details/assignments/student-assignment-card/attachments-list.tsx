'use client';

import { Download, FileText } from 'lucide-react';
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
    <div className='space-y-2'>
      {attachments.map((att) => (
        <div
          key={att.id}
          className='flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-2.5'
        >
          <FileText className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <div className='min-w-0 flex-1'>
            <a
              href={att.url}
              target='_blank'
              rel='noreferrer'
              className='block truncate text-sm text-foreground hover:text-primary'
            >
              {att.name}
            </a>
            {typeof att.size === 'number' ? (
              <p className='text-xs text-muted-foreground'>{formatFileSize(att.size)}</p>
            ) : null}
          </div>
          <a
            href={attachmentDownloadUrl(att.id)}
            className='inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90'
            title='Download'
            aria-label={`Download ${att.name}`}
          >
            <Download className='size-4' aria-hidden />
          </a>
        </div>
      ))}
    </div>
  );
}
