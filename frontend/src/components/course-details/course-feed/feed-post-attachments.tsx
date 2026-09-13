'use client';

import { Download, X as XIcon } from 'lucide-react';
import { confirmDelete } from '@/lib/notifications';
import type { CoursePost } from '@/lib/course-details/types';

interface FeedPostAttachmentsProps {
  post: CoursePost;
  userId: number | null;
  onDeleteAttachment: (fileId: number) => void;
}

export function FeedPostAttachments({
  post,
  userId,
  onDeleteAttachment
}: FeedPostAttachmentsProps) {
  if (post.attachments.length === 0) return null;

  return (
    <div className='mt-3 space-y-1.5'>
      {post.attachments.map((file) => (
        <div
          key={file.id}
          className='flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm'
        >
          <a
            href={file.url}
            target='_blank'
            rel='noreferrer'
            className='min-w-0 flex-1 truncate font-medium hover:underline'
          >
            {file.name}
          </a>
          {typeof file.size === 'number' ? (
            <span className='shrink-0 text-xs text-muted-foreground'>
              {(file.size / 1024).toFixed(1)} KB
            </span>
          ) : null}
          <a
            href={file.url}
            download={file.name}
            className='shrink-0 text-muted-foreground hover:text-foreground'
            title='Download'
          >
            <Download className='size-3.5' />
          </a>
          {post.authorId === userId ? (
            <button
              type='button'
              onClick={async () => {
                if (!(await confirmDelete(file.name))) return;
                onDeleteAttachment(file.id);
              }}
              className='shrink-0 text-muted-foreground hover:text-destructive'
              title='Remove attachment'
            >
              <XIcon className='size-3.5' />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
