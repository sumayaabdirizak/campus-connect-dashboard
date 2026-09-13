'use client';

import type { ChatMessage } from '@/lib/course-details/types';
import { cn } from '@/lib/utils';
import { ChatFileCard } from './chat-file-card';
import { attachmentToDisplayFile, type DisplayChatFile } from './chat-file-utils';

interface ChatAttachmentsProps {
  attachments: ChatMessage['attachments'];
  pendingFiles?: DisplayChatFile[];
  isOwn: boolean;
  embedded?: boolean;
}

export function ChatAttachments({
  attachments,
  pendingFiles = [],
  isOwn,
  embedded = false
}: ChatAttachmentsProps) {
  const files: DisplayChatFile[] = [
    ...attachments.map(attachmentToDisplayFile),
    ...pendingFiles
  ];

  if (files.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        !embedded && 'mt-1',
        isOwn && 'items-end'
      )}
    >
      {files.map((file) => (
        <ChatFileCard key={file.id} file={file} isOwn={isOwn} />
      ))}
    </div>
  );
}
